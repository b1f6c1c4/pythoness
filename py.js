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
    this.memoize = {};
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
      url: `/user/repos?visibility=all&affiliation=owner&sort=pushed`,
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

  async userPythoness({ publicOnly, user }, { self, following, followers }) {
    const memoizable = publicOnly && self && !following && !followers;
    if (memoizable && this.memoize[user]) {
      return this.memoize[user];
    }
    const todo = [];
    if (self) {
      todo.push((async () => {
        let repos;
        if (!publicOnly) {
          repos = await this.getPrivateRepos();
        } else {
          repos = await this.getPublicRepos({ user });
        }
        const stats = await Promise.all(repos.map((r) =>
          this.repoPythoness({ user }, r)));
        const ret = { stat: congress(stats), repos: {} };
        repos.forEach(({ name }, i) => {
          ret.repos[name] = stats[i];
        });
        return { pythoness: ret.stat.pythoness, self: ret };
      })());
    }
    if (following) {
      todo.push((async () => {
        const fos = await this.getFollowing({ user });
        const stats = await Promise.all(fos.map(({ login }) =>
          this.userPythoness({ publicOnly: true, user: login }, { self: true })));
        const ret = { stat: congress(stats), users: {} };
        fos.forEach(({ login }, i) => {
          ret.users[login] = stats[i];
        });
        return { pythoness: ret.stat.pythoness, following: ret };
      })());
    }
    if (followers) {
      todo.push((async () => {
        const fos = await this.getFollowers({ user });
        const stats = await Promise.all(fos.map(({ login }) =>
          this.userPythoness({ publicOnly: true, user: login }, { self: true })));
        const ret = { stat: congress(stats), users: {} };
        fos.forEach(({ login }, i) => {
          ret.users[login] = stats[i];
        });
        return { pythoness: ret.stat.pythoness, followers: ret };
      })());
    }
    const results = await Promise.all(todo);
    const res = results.reduce((p, c) => Object.assign(p, c), {});
    res.pythoness = Math.sqrt(results.reduce((p, c) => p + c.pythoness ** 2, 0) / results.length);
    if (self) {
      res.h = res.self.stat.h;
      res.s = res.self.stat.h ? 1000 : 10;
    }
    debug({ pythoness: res.pythoness, s: res.s, h: res.h });
    if (memoizable) {
      this.memoize[user] = res;
    }
    return res;
  }
}

module.exports = Pythoness;
