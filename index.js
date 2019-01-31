/*
 * pythoness
 * Copyright (C) 2019 b1f6c1c4
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
const os = require('os');
const path = require('path');
const fs = require('fs');
const yargRoot = require('yargs');
const debug = require('debug')('pythoness');

const readToken = ({ token, tokenFile }) => {
  if (token) {
    return token;
  }
  try {
    return fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch (e) {
    console.error(`Error occured during reading token file ${tokenFile}.`);
    console.error('Please check its existance and permission.');
    return undefined;
  }
}

const check = async ({ }, token) => {
  debug({ });
  // TODO
}

const defaultTokenFile = path.join(os.homedir(), '.pythoness');
const hasDefaultTokenFile = fs.existsSync(defaultTokenFile);

module.exports = yargRoot
  .option('token-file', {
    describe: 'Github token file for private repo access, see https://github.com/settings/tokens',
    default: hasDefaultTokenFile ? defaultTokenFile : undefined,
    type: 'string',
  })
  .option('t', {
    alias: 'token',
    describe: 'Github token for private repo access, see https://github.com/settings/tokens',
    type: 'string',
  })
  .option('public', {
    describe: 'Ignore all private repos (so a token is unnecessary)',
    type: 'boolean',
    default: !hasDefaultTokenFile,
  })
  .conflicts('public', 't')
  .conflicts('public', 'token-file')
  .conflicts('t', 'token-file')
  .command(['check <who>', '$0'], 'Check pythoness of a Github user', (yargs) => {
    yargs
      .option('s', {
        alias: 'self',
        describe: 'Check their own repos',
        type: 'boolean',
        default: true,
      })
      .option('f', {
        alias: 'following',
        describe: 'Check following\'s repos (depth=1)',
        type: 'boolean',
        default: true,
      })
      .option('F', {
        alias: 'follower',
        describe: 'Check followers\' repos (depth=1)',
        type: 'boolean',
        default: false,
      })
      .positional('who', {
        describe: 'Github username',
        type: 'string',
        demandCommand: true,
      });
  }, (argv) => {
    const { public } = argv;
    const token = public ? undefined : readToken(argv);
    if (!public && !token) {
      return;
    }
    runCheck(argv, token).catch((e) => {
      console.error(e.message);
      if (e.response) {
        console.error(e.response.data);
      }
    });
  })
  .help()
  .parse;
