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
pythoness             # Check your daily Pythoness, public & private
pythoness --public    # Check your daily Pythoness, public repo only
pythoness b1f6c1c4    # How Pythonic another user is? (public only)
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
  --token-file     Github token file for full control of private repos, see
                   https://github.com/settings/tokens
                                              [string] [default: "~/.pythoness"]
  -t, --token      Github token for full control of private repos, see
                   https://github.com/settings/tokens                   [string]
  --public         Ignore all private repos                            [boolean]
  --help           Show help                                           [boolean]
  -s, --self       Check their own repos               [boolean] [default: true]
  -S, --star       Include starred repos               [boolean] [default: true]
  -f, --following  Check following's repos (depth=1)   [boolean] [default: true]
  -F, --followers  Check followers' repos (depth=1)    [boolean] [default: true]
```

## FAQ

### Why this program is written in JavaScript, not Python?

Because of neutrality of accounting.

### How Pythoness calculated?

#### Pythoness of a single repo

<img src="https://latex.codecogs.com/gif.latex?1-\exp\left(1+\frac{2/3}{\lambda-2/3}\right)" />

where <img src="https://latex.codecogs.com/gif.latex?\lambda" /> is the ratio of Python bytes among all code bytes (the proportion of Python blue in the Github webpage).

#### Self-Pythoness of an user

Self-Pythoness of an user is defined to be the "congress" average of their repos' Pythoness.
First, a repo is assigned senate and the house seats, separatedly, based on the following rules:

| type | Senate seats | The House seats |
| --- | --- | --- |
| owner, empty, source | 100 | 0 |
| owner, empty, fork | 1 | 0 |
| owner, non-empty, source | 1000 | Number of total code bytes |
| owner, non-empty, fork | 50 | 0 |
| non-owner, starred | 10 | 0 |

Then, senate and the house will "vote", or calculate weighted arithmetic average.
Finally, the "congress" average is defined as

<img src="https://latex.codecogs.com/gif.latex?\sqrt{\frac{\text{Senate}^2+\text{House}^2}{2}}" />

#### Following-Pythoness of an user

First, all users followed by the targeted user will be enumerated and have their self-pythoness calculated.
Next, each one is assigned senate and the house seats, separatedly, based on the following rules:

| type | Senate seats | The House seats |
| --- | --- | --- |
| has written at least one byte code | 1000 | Number of total code bytes |
| has not writeen any code | 10 | 0 |

Then follow the same procedure as above.

#### Followers-Pythoness of an user

All users following the targeted user will be enumerated and have their self-pythoness calculated.
The same procedure as above applies.

#### Final Pythoness of an user

It's defined as the RMS (root-mean-square) of their self-, following-, followers- Pythoness (whichever enabled in the command line).

## Legal

This repo is licensed with GNU AGPLv3 or later.

Again, the output of this program has absolutely no relationship with the Github user's personality, morality, and/or technical skills.
Do NOT judge any person, organization, or entity based on how pythonic they are(aren't)/it is(isn't).
The author(s) hold(s) absolutely no liability for anything caused by any interpretation of pythonic information, including but not limited to the output of this program.
