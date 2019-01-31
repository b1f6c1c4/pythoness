# pythoness

[![npm](https://img.shields.io/npm/v/pythoness.svg?style=flat-square)](https://www.npmjs.com/package/pythoness)
[![npm](https://img.shields.io/npm/dt/pythoness.svg?style=flat-square)](https://www.npmjs.com/package/pythoness)
[![GitHub last commit](https://img.shields.io/github/last-commit/b1f6c1c4/pythoness.svg?style=flat-square)](https://github.com/b1f6c1c4/pythoness)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/b1f6c1c4/pythoness.svg?style=flat-square)](https://github.com/b1f6c1c4/pythoness)
[![license](https://img.shields.io/github/license/b1f6c1c4/pythoness.svg?style=flat-square)](https://github.com/b1f6c1c4/pythoness/blob/master/LICENSE.md)

> Check how pythonic a Github user is.

:heavy_exclamation_mark:
:heavy_exclamation_mark:
**DO NOT judge any one based on how pythonic/a-pythonic they are/it is.**
:heavy_exclamation_mark:
:heavy_exclamation_mark:

## TL;DR

```sh
npm i -g pythoness
# Generate a token at https://github.com/settings/tokens
echo the-token > ~/.pythoness
pythoness             # Check your daily Pythoness
pythoness b1f6c1c4    # How Pythonic another user is?
```

## Installation

```sh
$ npm install --global pythoness
```
## Usage

```
pythoness [<who>]

Check pythoness of a Github user

Commands:
  pythoness check [<who>]  Check pythoness of a Github user            [default]

Positionals:
  who  Github username                                                  [string]

Options:
  --version        Show version number                                 [boolean]
  --token-file     Github token file for private repo access, see
                   https://github.com/settings/tokens                   [string]
  -t, --token      Github token for private repo access, see
                   https://github.com/settings/tokens                   [string]
  --public         Ignore all private repos (so a token is unnecessary)[boolean]
  --help           Show help                                           [boolean]
  -s, --self       Check their own repos               [boolean] [default: true]
  -f, --following  Check following's repos (depth=1)   [boolean] [default: true]
  -F, --followers  Check followers' repos (depth=1)    [boolean] [default: true]
```

## Legal

This repo is licensed with GNU AGPLv3 or later.

Again, the output of this program has absolutely no relationship with the Github user's personality, morality, and/or technical skills.
Do NOT judge any person, organization, or entity based on how pythonic they are(aren't)/it is(isn't).
The author(s) hold(s) absolutely no liability for anything caused by any interpretation of pythonic information, including but not limited to the output of this program.
