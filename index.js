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

const readToken = ({ token, tokenFile }) => {
  if (token) {
    return token;
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

const runCheck = async ({ public, who, self, star, following, followers }, token) => {
  const py = new Pythoness({ token });
  const me = await py.getMe();
  if (!who) {
    who = me;
  }
  if (who !== me) {
    if (public === false) {
      throw new Error('You can\' access other\'s private repo');
    }
    public = true;
  } else if (public === undefined) {
    public = false;
  }
  debug({ public, who, self, star, following, followers });
  const res = await py.userPythoness({ user: who, publicOnly: public }, { self, star, following, followers });
  console.log('='.repeat(110));
  console.log(`Pythoness Report for ${who}`);
  if (self) {
    console.log('='.repeat(110));
    console.log('Repos:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['Repo', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [42, 25, 15, 17],
    });
    for (const r in res.self.repos) {
      const { pythoness, s, h } = res.self.repos[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    if (star) {
      console.log('Stars:');
      const tbl = new Table({
        chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
        head: ['Repo', 'Pythoness', 'Senate Seats', 'The House Seats'],
        colWidths: [42, 25, 15, 17],
      });
      for (const r in res.self.stars) {
        const { pythoness, s, h } = res.self.stars[r];
        tbl.push([
          r,
          pythoness,
          s,
          h,
        ]);
      }
      console.log(tbl.toString());
    }
    console.log(`  Senate votes: ${res.self.stat.x} House votes: ${res.self.stat.y}`);
    console.log(`  Self pythoness: ${res.self.stat.pythoness}`);
  }
  if (following) {
    console.log('='.repeat(110));
    console.log('Following:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [42, 25, 15, 17],
    });
    for (const r in res.following.users) {
      const { pythoness, s, h } = res.following.users[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    console.log(`  Senate votes: ${res.following.stat.x} House votes: ${res.following.stat.y}`);
    console.log(`  Following pythoness: ${res.following.stat.pythoness}`);
  }
  if (followers) {
    console.log('='.repeat(110));
    console.log('Followers:');
    const tbl = new Table({
      chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
      head: ['User', 'Pythoness', 'Senate Seats', 'The House Seats'],
      colWidths: [42, 25, 15, 17],
    });
    for (const r in res.followers.users) {
      const { pythoness, s, h } = res.followers.users[r];
      tbl.push([
        r,
        pythoness,
        s,
        h,
      ]);
    }
    console.log(tbl.toString());
    console.log(`  Senate votes: ${res.followers.stat.x} House votes: ${res.followers.stat.y}`);
    console.log(`  Following pythoness: ${res.followers.stat.pythoness}`);
  }
  console.log('='.repeat(110));
  console.log(`The Final Pythoness of ${who} is: ${res.pythoness}`);
}

module.exports = yargRoot
  .strict()
  .option('token-file', {
    describe: 'Github token file for full control of private repos, see https://github.com/settings/tokens',
    default: path.join(os.homedir(), '.pythoness'),
    type: 'string',
  })
  .option('t', {
    alias: 'token',
    describe: 'Github token for full control of private repos, see https://github.com/settings/tokens',
    type: 'string',
  })
  .option('public', {
    describe: 'Ignore all private repos',
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
      .option('S', {
        alias: 'star',
        describe: 'Include starred repos',
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
        alias: 'followers',
        describe: 'Check followers\' repos (depth=1)',
        type: 'boolean',
        default: true,
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
