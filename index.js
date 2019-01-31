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
const Table = require('cli-table');
const Pythoness = require('./py');

const readToken = ({ public, token, tokenFile }) => {
  const def = path.join(os.homedir(), '.pythoness');
  if (public === undefined && token === undefined && tokenFile === undefined) {
    if (fs.existsSync(def)) {
      public = false;
      tokenFile = def;
    } else {
      public = true;
    }
  }
  if (public) {
    if (token !== undefined || tokenFile !== undefined) {
      console.error('--public implies no token');
      process.exit(1);
    }
    return undefined;
  }
  if (token) {
    return token;
  }
  if (tokenFile === undefined) {
    tokenFile = def;
  }
  try {
    return fs.readFileSync(tokenFile, 'utf-8').trim();
  } catch (e) {
    console.error(`Error occured during reading token file ${tokenFile}.`);
    console.error('Please check its existance and permission.');
    process.exit(1);
    return undefined;
  }
}

const runCheck = async ({ who, self, following, followers }, token) => {
  const py = new Pythoness({ token });
  if (!who) {
    if (token) {
      who = await py.getMe();
    } else {
      throw new Error('<who> is not specified, nor <token>.');
    }
  }
  debug({ who, self, following, followers });
  const res = await py.userPythoness({ user: who }, { self, following, followers });
  console.log('='.repeat(110));
  console.log(`Pythoness Report for ${who}`);
  if (self) {
    console.log('='.repeat(110));
    console.log('Repos:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['Repo', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [37, 25, 15, 17],
    });
    for (const r in res.self) {
      const { pythoness, s, h } = res.self[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    console.log(`  Senate votes: ${res.selfStat.x} House votes: ${res.selfStat.y}`);
    console.log(`  Self pythoness: ${res.selfStat.pythoness}`);
  }
  if (following) {
    console.log('='.repeat(110));
    console.log('Following:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [37, 25, 15, 17],
    });
    for (const r in res.following) {
      const { pythoness, s, h } = res.following[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    console.log(`  Senate votes: ${res.followingStat.x} House votes: ${res.followingStat.y}`);
    console.log(`  Following pythoness: ${res.followingStat.pythoness}`);
  }
  if (followers) {
    console.log('='.repeat(110));
    console.log('Followers:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [37, 25, 15, 17],
    });
    for (const r in res.followers) {
      const { pythoness, s, h } = res.followers[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    console.log(`  Senate votes: ${res.followersStat.x} House votes: ${res.followersStat.y}`);
    console.log(`  Following pythoness: ${res.followersStat.pythoness}`);
  }
  console.log('='.repeat(110));
  console.log(`The Final Pythoness of ${who} is: ${res.pythoness}`);
}

module.exports = yargRoot
  .option('token-file', {
    describe: 'Github token file for private repo access, see https://github.com/settings/tokens',
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
  })
  .conflicts('t', 'token-file')
  .command(['check [<who>]', '$0'], 'Check pythoness of a Github user', (yargs) => {
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
        default: false,
      })
      .option('F', {
        alias: 'followers',
        describe: 'Check followers\' repos (depth=1)',
        type: 'boolean',
        default: false,
      })
      .positional('who', {
        describe: 'Github username',
        type: 'string',
      });
  }, (argv) => {
    const token = readToken(argv);
    runCheck(argv, token).catch((e) => {
      debug(e);
      console.error(e.message);
      if (e.response) {
        console.error(e.response.data);
      }
      process.exit(1);
    });
  })
  .help()
  .parse;
