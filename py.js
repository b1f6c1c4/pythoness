const axios = require('axios');
const { TaskQueue } = require('cwait');
const debug = require('debug')('pythoness');

const congress = (stats) => {
  let { x, y, nb } = stats.reduce(({ x, y, nb }, { pythoness, totalBytes }) =>
    ({ x: x + pythoness, y: y + pythoness * totalBytes, nb: nb + totalBytes }), {
      x: 0, y: 0, nb: 0,
    });
  if (x) {
    x /= stats.length;
  }
  if (y) {
    y /= nb;
  }
  const p = Math.sqrt((x ** 2 + y ** 2) / 2);
  debug({ x, y, p });
  return { x, y, pythoness: p, totalBytes: nb };
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
      url: `/user/repos`,
    });
    return data;
  }

  async getPublicRepos({ user }) {
    const { data } = await this.run({
      method: 'get',
      url: `/users/${user}/repos`,
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

  async repoPythoness(args) {
    let langs;
    try {
      langs = await this.getLanguages(args);
    } catch (e) {
      debug(e);
      console.error(`Error occured when reading ${args.user}/${args.repo}. Treated as non-exist`);
      console.error(e.message);
      return { pythoness: 0, totalBytes: 0 };
    }
    const pyBytes = langs.Python === undefined ? 0 : langs.Python;
    let totalBytes = 0;
    for (const lang in langs) {
      totalBytes += langs[lang];
    }
    let pythoness = pyBytes / totalBytes;
    const crit = 2 / 3;
    if (!pyBytes) {
      pythoness = 0;
    } else if (pythoness >= crit) {
      pythoness = 1;
    } else {
      pythoness = 1 - Math.exp(1 + crit / (pythoness - crit));
    }
    debug({ args, langs, pythoness, pyBytes, totalBytes });
    return { pythoness, totalBytes };
  }

  async reposPythoness(repos) {
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
      const stats = await Promise.all(repos.map(({ name }) =>
        this.repoPythoness({ user, repo: name })));
      res.self = {};
      repos.forEach(({ name }, i) => {
        res.self[name] = stats[i];
      });
      res.selfStat = congress(stats.filter((r) => r.totalBytes));
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
      res.totalBytes = res.selfStat.totalBytes;
    }
    debug({ pythoness: res.pythoness, totalBytes: res.totalBytes });
    return res;
  }
}

module.exports = Pythoness;
