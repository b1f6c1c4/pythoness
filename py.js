const axios = require('axios');
const debug = require('debug')('pythoness');

const congress = (stats) => {
  if (!stats.length) {
    return { x: 0, y: 0, pythoness: 0, totalBytes: 0 };
  }
  let { x, y, nb } = stats.reduce(({ x, y, nb }, { pythoness, totalBytes }) =>
    ({ x: x + pythoness, y: y + pythoness * totalBytes, nb: nb + totalBytes }), {
      x: 0, y: 0, nb: 0,
    });
  x /= stats.length;
  y /= nb;
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
    const langs = await this.getLanguages(args);
    debug({ args, langs });
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
    debug({ args, pythoness, pyBytes, totalBytes });
    return { pythoness, pyBytes, totalBytes };
  }

  async reposPythoness(repos) {
    const stats = await Promise.all(repos.map(this.repoPythoness.bind(this)));
    return congress(stats);
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
      res.self = await this.reposPythoness(repos.map(({ name }) =>
        ({ user, repo: name })));
      final += res.self.pythoness ** 2;
      nFinal++;
    }
    if (following) {
      const fos = await this.getFollowing({ user });
      const stats = await Promise.all(fos.map(({ login }) =>
        this.userPythoness({ user: login }, { self: true })));
      res.following = stats;
      res.followingStats = congress(stats);
      final += res.following.pythoness ** 2;
      nFinal++;
    }
    if (followers) {
      const fos = await this.getFollowers({ user });
      const stats = await Promise.all(fos.map(({ login }) =>
        this.userPythoness({ user: login }, { self: true })));
      res.follower = stats;
      res.followerStats = congress(stats);
      final += res.followers.pythoness ** 2;
      nFinal++;
    }
    res.pythoness = Math.sqrt(final / nFinal);
    if (self) {
      res.totalBytes = res.self.totalBytes;
    }
    debug({ pythoness: res.pythoness, totalBytes: res.totalBytes });
    return res;
  }
}

module.exports = Pythoness;
