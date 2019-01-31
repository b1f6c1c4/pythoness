const axios = require('axios');
const { TaskQueue } = require('cwait');
const debug = require('debug')('pythoness');

const congress = (stats) => {
  let { x, y, ns, nh } = stats.reduce(({ x, y, ns, nh }, { pythoness, s, h }) =>
    ({ x: x + pythoness * s, y: y + pythoness * h, ns: ns + s, nh: nh + h }), {
      x: 0, y: 0, ns: 0, nh: 0,
    });
  if (x) {
    x /= ns;
  }
  if (y) {
    y /= nh;
  }
  const p = Math.sqrt((x ** 2 + y ** 2) / 2);
  debug({ x, y, p });
  return { x, y, pythoness: p, s: ns, h: nh };
};

class Pythoness {
  constructor(config) {
    const { token } = config;
    this.config = token;
    this.axios = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 10000,
      headers: { Authorization: 'token ' + token },
    });
    this.axios.interceptors.response.use((r) => {
      // debug(r.status + ' ' + r.statusText);
      return r;
    }, (e) => {
      if (e.response) {
        debug(e.response.status + ' ' + e.response.statusText);
      } else {
        debug(e);
      }
      return Promise.reject(e);
    });
    this.queue = new TaskQueue(Promise, 32);
    this.run = this.queue.wrap(this.run.bind(this));
  }

  run(cfg) {
    debug(cfg);
    return this.axios(cfg);
  }

  async getRepo({ user, repo }) {
    const { data } = await this.run({
      method: 'get',
      url: `/repos/${user}/${repo}`,
    });
    return data;
  }

  async getMe() {
    const { data } = await this.run({
      method: 'get',
      url: '/user',
    });
    return data.login;
  }

  async getFollowing({ user }) {
    const { data } = await this.run({
      method: 'get',
      url: `/users/${user}/following`,
    });
    return data;
  }

  async getFollowers({ user }) {
    const { data } = await this.run({
      method: 'get',
      url: `/users/${user}/followers`,
    });
    return data;
  }

  async getPrivateRepos() {
    const { data } = await this.run({
      method: 'get',
      url: `/user/repos?affiliation=owner&sort=pushed`,
    });
    return data;
  }

  async getPublicRepos({ user }) {
    const { data } = await this.run({
      method: 'get',
      url: `/users/${user}/repos?sort=pushed`,
    });
    return data;
  }

  async getLanguages({ user, repo }) {
    const { data } = await this.run({
      method: 'get',
      url: `/repos/${user}/${repo}/languages`,
    });
    return data;
  }

  async repoPythoness({ user }, { name, fork }) {
    let langs;
    try {
      langs = await this.getLanguages({ user, repo: name });
    } catch (e) {
      debug(e);
      console.error(`Error occured when reading ${user}/${name}. Treated as empty`);
      console.error(e.message);
      return { pythoness: 0, s: fork ? 1 : 100, h: 0 };
    }
    const pyBytes = langs.Python === undefined ? 0 : langs.Python;
    let h = 0;
    for (const lang in langs) {
      h += langs[lang];
    }
    let pythoness = pyBytes / h;
    const crit = 2 / 3;
    if (!pyBytes) {
      pythoness = 0;
    } else if (pythoness >= crit) {
      pythoness = 1;
    } else {
      pythoness = 1 - Math.exp(1 + crit / (pythoness - crit));
    }
    debug({ user, name, fork, langs, pythoness, pyBytes, h });
    return { pythoness, s: fork ? 20 : 1000, h: fork ? 0 : h };
  }

  async userPythoness({ user }, { self, following, followers }) {
    const res = {};
    let final = 0, nFinal = 0;
    if (self) {
      let repos;
      if (!user) {
        repos = await this.getPrivateRepos();
      } else {
        repos = await this.getPublicRepos({ user });
      }
      const stats = await Promise.all(repos.map((r) =>
        this.repoPythoness({ user }, r)));
      res.self = {};
      repos.forEach(({ name }, i) => {
        res.self[name] = stats[i];
      });
      res.selfStat = congress(stats);
      final += res.selfStat.pythoness ** 2;
      nFinal++;
    }
    if (following) {
      const fos = await this.getFollowing({ user });
      const stats = await Promise.all(fos.map(({ login }) =>
        this.userPythoness({ user: login }, { self: true })));
      res.following = {};
      fos.forEach(({ login }, i) => {
        res.following[login] = stats[i];
      });
      res.followingStat = congress(stats);
      final += res.followingStat.pythoness ** 2;
      nFinal++;
    }
    if (followers) {
      const fos = await this.getFollowers({ user });
      const stats = await Promise.all(fos.map(({ login }) =>
        this.userPythoness({ user: login }, { self: true })));
      res.followers = {};
      fos.forEach(({ login }, i) => {
        res.followers[login] = stats[i];
      });
      res.followersStat = congress(stats);
      final += res.followersStat.pythoness ** 2;
      nFinal++;
    }
    res.pythoness = Math.sqrt(final / nFinal);
    if (self) {
      res.h = res.selfStat.h;
      res.s = res.selfStat.h ? 1000 : 10;
    }
    debug({ pythoness: res.pythoness, s: res.s, h: res.h });
    return res;
  }
}

module.exports = Pythoness;
