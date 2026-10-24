# Make HummingRead yours

HummingRead is free software under the [MIT license](LICENSE). You may inspect, fork, modify, build and redistribute it, including commercially, while preserving the copyright and license notice. The license does not give rights to other people's books or imply endorsement of a fork.

Use your preferred tools, including AI assistance. Review generated code, keep local reading data private, and describe what you tested.

## Build a personal version

```sh
npm ci
npm run build:web
npm start
```

Open the printed loopback URL. Do not commit personal books, backups, signing keys, credentials or generated runtime evidence.

For iOS preparation: `npm run cap:sync`, `npm run ios:verify-source`. A real iOS build requires current Xcode on macOS and your signing team for device distribution. Keep an existing installed app's identifier if you need its local data; use your own identifier for an independent fork.

For a proposed change: run relevant unit/browser tests, `npm run verify:package` after native sync, and `git diff --check`. Browser mocks do not prove native picker/share/lifecycle behavior. Preserve MIT and third-party notices.

Support and private bug reports: vladimir_doronin@icloud.com. Public technical reports: [GitHub Issues](https://github.com/DoroninDobroCorp/RSVP_reader/issues). Please send a minimal synthetic example instead of a private book.
