const axios = require('axios');
const debug = require('debug')('pythoness');

class Pythoness {
  constructor(config) {
    const { token } = config;
    this.config = token;
    this.axios = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 10000,
      maxContentLength: 20000,
      headers: { Authorization: 'token ' + token },
    });
    this.axios.interceptors.response.use((r) => {
      debug(r.status + ' ' + r.statusText);
      return r;
    }, (e) => {
      debug(e.response.status + ' ' + e.response.statusText);
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
}

module.exports = Pythoness;
