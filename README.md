![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/interbolt_colin)

# Waku Land @ [https://waku.land](https://waku.land)

**Waku Land** is a live view of every example from [Waku](https://github.com/dai-shi/waku)'s main branch: https://github.com/dai-shi/waku/tree/main/examples. Once every six hours, each example is deployed in its own NodeJS worker process on [fly.io](https://fly.io/) and rendered inside of an iframe on [waku.land](https://waku.land/).

## Run it locally

**I'm using node v18.18.2 and pnpm v8.15.0.** Other versions might work but I can't guarantee anything.

#### Install

```shell
git clone https://github.com/InterBolt/waku-land.git
cd waku-land
pnpm install
```

#### Pull code from Waku

⚠️ This will take a while and is pretty intensive since it installs and builds every example repo in parallel. I might need to optimize this if more examples are added.

```shell
pnpm run dev:setup
```

#### Start local servers

This uses NodeJS's [cluster module](https://nodejs.org/api/cluster.html) to spawn a worker per each of the following servers: the waku.land website, each example deployment, and a proxy server to map subdomains (ex: **waku-01-template**.waku.land) to the correct port.

```shell
pnpm run dev
```

## Use a fork of Waku instead

> This is useful if you are experimenting with custom examples on your own Waku fork. 

Add a custom env variable called `WAKU_REPO` to an .env file at the repo root likeso:

```shell
# This will uses the examples in campbellman's fork
WAKU_REPO="https://github.com/campbellman/waku.git"
```

## Add your own example to waku.land

I don't have a process for this so I recommend creating an issue with a link to a repo that you would like for me to include and we can go from there. I'm also open to the idea of including examples that are already deployed on their own domain. After all, waku.land just uses iframes to display the current examples.

## Contributing

I'll consider accepting PRs but for now I recommend opening an issue with a request or code example first.

## About the author

I run a software consulting firm called [InterBolt](https://interbolt.org) and am open to work. I also hang out on [Twitter](https://twitter.com/interbolt_colin) too much and run a small [newsletter](https://interbolt.ck.page/8e222f4c7a) if you're interested in fun content.

