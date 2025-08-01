# Changelog

## Unpublished

### 🛠 Breaking changes

### 🎉 New features

- expose `ExpoFontLoader` on web ([#37991](https://github.com/expo/expo/pull/37991) by [@vonovak](https://github.com/vonovak))
- Add local package mocks. ([#37736](https://github.com/expo/expo/pull/37736) by [@aleqsio](https://github.com/aleqsio))

### 🐛 Bug fixes

### 💡 Others

- [web] remove deprecated style 'type' attribute ([#38114](https://github.com/expo/expo/pull/38114) by [@vonovak](https://github.com/vonovak))

## 13.3.2 - 2025-07-01

_This version does not introduce any user-facing changes._

## 13.3.1 — 2025-05-02

### 🐛 Bug fixes

- Bail out early when `getLoadedFonts` returns an empty array. ([#36586](https://github.com/expo/expo/pull/36586) by [@brentvatne](https://github.com/brentvatne))

## 13.3.0 — 2025-04-30

### 🎉 New features

- [Android] Added support for font weight styles (through XML font definitions) to config plugin. ([#26082](https://github.com/expo/expo/pull/26082) by [@jongbelegen](https://github.com/jongbelegen))

## 13.2.2 — 2025-04-25

_This version does not introduce any user-facing changes._

## 13.2.1 — 2025-04-21

_This version does not introduce any user-facing changes._

## 13.2.0 — 2025-04-21

### 🎉 New features

- Render to image ([#36185](https://github.com/expo/expo/pull/36185) by [@jakex7](https://github.com/jakex7))

## 13.1.2 — 2025-04-14

_This version does not introduce any user-facing changes._

## 13.1.1 — 2025-04-09

_This version does not introduce any user-facing changes._

## 13.1.0 — 2025-04-04

### 🛠 Breaking changes

- Bump minimum macOS version to 11.0. ([#34980](https://github.com/expo/expo/pull/34980) by [@gabrieldonadel](https://github.com/gabrieldonadel))

### 🎉 New features

- Support loading expo-font in a `react-server` environment. ([#34736](https://github.com/expo/expo/pull/34736) by [@EvanBacon](https://github.com/EvanBacon))

### 🐛 Bug fixes

- Add missing export specifier. ([#34839](https://github.com/expo/expo/pull/34839) by [@EvanBacon](https://github.com/EvanBacon))

### 💡 Others

- [Android] Started using expo modules gradle plugin. ([#34176](https://github.com/expo/expo/pull/34176) by [@lukmccall](https://github.com/lukmccall))

## 13.0.4 - 2025-02-19

_This version does not introduce any user-facing changes._

## 13.0.3 - 2025-01-10

### 🐛 Bug fixes

- [ios] Fix crash when writing to fontFamilyAliases ([#34044](https://github.com/expo/expo/pull/34044) by [@techied](https://github.com/techied))

## 13.0.2 - 2024-12-19

### 🐛 Bug fixes

- [iOS] Fix crash when accessing resource from multiple threads ([#33574](https://github.com/expo/expo/pull/33574) by [@chrfalch](https://github.com/chrfalch))

## 13.0.1 — 2024-11-05

### 💡 Others

- Remove deprecated Font.processFontFamily() ([#32631](https://github.com/expo/expo/pull/32631) by [@brentvatne](https://github.com/brentvatne))

## 13.0.0 — 2024-10-22

### 🛠 Breaking changes

- Bumped iOS and tvOS deployment target to 15.1. ([#30840](https://github.com/expo/expo/pull/30840) by [@tsapeta](https://github.com/tsapeta))

### 🎉 New features

- More detailed error messages for `FontLoader` native module rejections ([#31104](https://github.com/expo/expo/pull/31104) by [@vonovak](https://github.com/vonovak))
- Add `getLoadedFonts()` function ([#30431](https://github.com/expo/expo/pull/30431) by [@vonovak](https://github.com/vonovak))

### 🐛 Bug fixes

- `useFonts` could previously attempt to set state on an unmounted component ([#31143](https://github.com/expo/expo/pull/31143) by [@vonovak](https://github.com/vonovak))
- On iOS `loadAsync()` will reject if font loading fails. ([#31053](https://github.com/expo/expo/pull/31053) by [@vonovak](https://github.com/vonovak))
- Add missing `react` peer dependencies for isolated modules. ([#30467](https://github.com/expo/expo/pull/30467) by [@byCedric](https://github.com/byCedric))
- Only import from `expo/config` to follow proper dependency chains. ([#30501](https://github.com/expo/expo/pull/30501) by [@byCedric](https://github.com/byCedric))

### 💡 Others

- Stopped scoping font family names in Expo Go on Android. ([#28797](https://github.com/expo/expo/pull/28797) by [@lukmccall](https://github.com/lukmccall))
- Replaced `@testing-library/react-hooks` with `@testing-library/react-native`. ([#30742](https://github.com/expo/expo/pull/30742) by [@byCedric](https://github.com/byCedric))
- Removed all `NativeModulesProxy` occurrences. ([#31496](https://github.com/expo/expo/pull/31496) by [@reichhartd](https://github.com/reichhartd))

## 12.0.10 - 2024-09-03

### 🐛 Bug fixes

- Fix support for macOS. ([#31307](https://github.com/expo/expo/pull/31307) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 12.0.9 - 2024-07-16

### 🐛 Bug fixes

- On `iOS`, fix issues where fonts were removed when the app is backgrounded. ([#30400](https://github.com/expo/expo/pull/30400) by [@alanjhughes](https://github.com/alanjhughes))

## 12.0.8 - 2024-07-11

### 🎉 New features

- Allow `woff` and `woff2` format on iOS with the config plugin. ([#30220](https://github.com/expo/expo/pull/30220) by [@titozzz](https://github/Titozzz))

## 12.0.7 - 2024-06-06

### 🐛 Bug fixes

- On `iOS`, store the font `postscriptName` instead of `fullName` which is what `iOS` will use to register the font. ([#29502](https://github.com/expo/expo/pull/29502) by [@alanjhughes](https://github.com/alanjhughes))

## 12.0.6 - 2024-05-29

### 🐛 Bug fixes

- [iOS] Fix font registration failing when font was in use. ([#28989](https://github.com/expo/expo/pull/28989) by [@aleqsio](https://github.com/aleqsio))

## 12.0.5 — 2024-05-10

### 🐛 Bug fixes

- Fixed some vector icons not rendering correctly. ([#28747](https://github.com/expo/expo/pull/28747) by [@tsapeta](https://github.com/tsapeta))

## 12.0.4 — 2024-04-24

_This version does not introduce any user-facing changes._

## 12.0.3 — 2024-04-24

- Fix font name lookup when name is not the same as family. ([#28407](https://github.com/expo/expo/pull/28407) by [@brentvatne](https://github.com/brentvatne))

## 12.0.2 — 2024-04-23

_This version does not introduce any user-facing changes._

## 12.0.1 — 2024-04-22

### 💡 Others

- Stopped scoping font family names in Expo Go on iOS. ([#28344](https://github.com/expo/expo/pull/28344) by [@tsapeta](https://github.com/tsapeta))

## 12.0.0 — 2024-04-18

### 🎉 New features

- [iOS] The native module has been simplified and rewritten to Swift. ([#26380](https://github.com/expo/expo/pull/26380) by [@tsapeta](https://github.com/tsapeta))

### 💡 Others

- drop unused web `name` property. ([#27437](https://github.com/expo/expo/pull/27437) by [@EvanBacon](https://github.com/EvanBacon))
- Remove most of Constants.appOwnership. ([#26313](https://github.com/expo/expo/pull/26313) by [@wschurman](https://github.com/wschurman))
- Removed deprecated backward compatible Gradle settings. ([#28083](https://github.com/expo/expo/pull/28083) by [@kudo](https://github.com/kudo))

## 11.10.3 - 2024-02-16

### 🐛 Bug fixes

- Only include supported font files when using the plugin. ([#27002](https://github.com/expo/expo/pull/27002) by [@alanjhughes](https://github.com/alanjhughes))

## 11.10.2 - 2024-01-18

_This version does not introduce any user-facing changes._

## 11.10.1 - 2024-01-10

### 🎉 New features

- Added support for macOS platform. ([#26242](https://github.com/expo/expo/pull/26242) by [@tsapeta](https://github.com/tsapeta))

## 11.10.0 — 2023-12-12

### 🎉 New features

- Added custom native fonts support to `Font.isLoaded()`. ([#25770](https://github.com/expo/expo/pull/25770) by [@kudo](https://github.com/kudo))

## 11.9.0 — 2023-11-14

### 🛠 Breaking changes

- Bumped iOS deployment target to 13.4. ([#25063](https://github.com/expo/expo/pull/25063) by [@gabrieldonadel](https://github.com/gabrieldonadel))
- On `Android` bump `compileSdkVersion` and `targetSdkVersion` to `34`. ([#24708](https://github.com/expo/expo/pull/24708) by [@alanjhughes](https://github.com/alanjhughes))

### 🐛 Bug fixes

- Handle the case where no argument is passed to the plugin. ([#25138](https://github.com/expo/expo/pull/25138) by [@alanjhughes](https://github.com/alanjhughes))

## 11.8.0 — 2023-10-17

### 🛠 Breaking changes

- Dropped support for Android SDK 21 and 22. ([#24201](https://github.com/expo/expo/pull/24201) by [@behenate](https://github.com/behenate))

### 🎉 New features

- Added config plugin to allow fonts to be linked at build time. ([#24772](https://github.com/expo/expo/pull/24772) by [@alanjhughes](https://github.com/alanjhughes))
- Remove `unimodule.json` in favour of `expo-module.config.json`. ([#25099](https://github.com/expo/expo/pull/25099) by [@reichhartd](https://github.com/reichhartd))

## 11.7.0 — 2023-09-15

### 🎉 New features

- Added support for Apple tvOS. ([#24329](https://github.com/expo/expo/pull/24329) by [@douglowder](https://github.com/douglowder))

### 💡 Others

- Updated types for server functions. ([#23911](https://github.com/expo/expo/pull/23911) by [@EvanBacon](https://github.com/EvanBacon))

## 11.6.0 — 2023-09-04

### 🎉 New features

- Added support for React Native 0.73. ([#24018](https://github.com/expo/expo/pull/24018) by [@kudo](https://github.com/kudo))
- Add static font extraction support with `expo-router`. ([#24027](https://github.com/expo/expo/pull/24027) by [@EvanBacon](https://github.com/EvanBacon))

### 💡 Others

- Migrated `FontLoaderModule` to use Expo Modules API. ([#24015](https://github.com/expo/expo/pull/24015) by [@lukmccall](https://github.com/lukmccall))

## 11.5.1 — 2023-08-02

### 💡 Others

- Change unloaded font error to a warning. ([#23788](https://github.com/expo/expo/pull/23788) by [@EvanBacon](https://github.com/EvanBacon))

## 11.5.0 — 2023-07-28

### 🐛 Bug fixes

- Gracefully catch exceptions during font loading on web with `fontfaceobserver`. ([#22954](https://github.com/expo/expo/pull/22954) by [@bradjones1](https://github.com/bradjones1))

## 11.4.0 — 2023-06-21

_This version does not introduce any user-facing changes._

## 11.3.0 — 2023-06-13

### 🐛 Bug fixes

- Fixed Android build warnings for Gradle version 8. ([#22537](https://github.com/expo/expo/pull/22537), [#22609](https://github.com/expo/expo/pull/22609) by [@kudo](https://github.com/kudo))

## 11.2.0 — 2023-05-08

### 🐛 Bug fixes

- Fix require cycle on web. ([#21593](https://github.com/expo/expo/pull/21593) by [@EvanBacon](https://github.com/EvanBacon))

## 11.1.1 — 2023-02-09

_This version does not introduce any user-facing changes._

## 11.1.0 — 2023-02-03

### 💡 Others

- On Android bump `compileSdkVersion` and `targetSdkVersion` to `33`. ([#20721](https://github.com/expo/expo/pull/20721) by [@lukmccall](https://github.com/lukmccall))

## 11.0.1 — 2022-10-28

_This version does not introduce any user-facing changes._

## 11.0.0 — 2022-10-06

### 🛠 Breaking changes

- Bumped iOS deployment target to 13.0 and deprecated support for iOS 12. ([#18873](https://github.com/expo/expo/pull/18873) by [@tsapeta](https://github.com/tsapeta))

### 🎉 New features

- Added support for Metro web. ([#19234](https://github.com/expo/expo/pull/19234) by [@EvanBacon](https://github.com/EvanBacon))

## 10.2.0 — 2022-07-07

_This version does not introduce any user-facing changes._

## 10.1.0 — 2022-04-18

### ⚠️ Notices

- On Android bump `compileSdkVersion` to `31`, `targetSdkVersion` to `31` and `Java` version to `11`. ([#16941](https://github.com/expo/expo/pull/16941) by [@bbarthec](https://github.com/bbarthec))

## 10.0.5 - 2022-02-01

### 🐛 Bug fixes

- Fix `Plugin with id 'maven' not found` build error from Android Gradle 7. ([#16080](https://github.com/expo/expo/pull/16080) by [@kudo](https://github.com/kudo))

## 10.0.4 — 2021-11-17

_This version does not introduce any user-facing changes._

## 10.0.1 — 2021-10-01

_This version does not introduce any user-facing changes._

## 10.0.0 — 2021-09-28

### 🛠 Breaking changes

- Dropped support for iOS 11.0 ([#14383](https://github.com/expo/expo/pull/14383) by [@cruzach](https://github.com/cruzach))

### 🐛 Bug fixes

- Fix building errors from use_frameworks! in Podfile. ([#14523](https://github.com/expo/expo/pull/14523) by [@kudo](https://github.com/kudo))

## 9.3.0 — 2021-09-08

### 💡 Others

- Rewrite android code to Kotlin ([#13956](https://github.com/expo/expo/pull/13956) by [@kkafar](https://github.com/kkafar))

## 9.2.0 — 2021-06-16

### 🐛 Bug fixes

- Enable kotlin in all modules. ([#12716](https://github.com/expo/expo/pull/12716) by [@wschurman](https://github.com/wschurman))

### 💡 Others

- Migrated `unimodules-font-interface` and `unimodules-constants-interface` to `expo-modules-core`. ([#12949](https://github.com/expo/expo/pull/12949), [#12876](https://github.com/expo/expo/pull/12876) by [@tsapeta](https://github.com/tsapeta))
- Build Android code using Java 8 to fix Android instrumented test build error. ([#12939](https://github.com/expo/expo/pull/12939) by [@kudo](https://github.com/kudo))

## 9.1.0 — 2021-03-10

### 🎉 New features

- Updated Android build configuration to target Android 11 (added support for Android SDK 30). ([#11647](https://github.com/expo/expo/pull/11647) by [@bbarthec](https://github.com/bbarthec))

### 🐛 Bug fixes

- Remove peerDependencies and unimodulePeerDependencies from Expo modules. ([#11980](https://github.com/expo/expo/pull/11980) by [@brentvatne](https://github.com/brentvatne))

## 9.0.0 — 2021-01-15

### 🛠 Breaking changes

- Dropped support for iOS 10.0 ([#11344](https://github.com/expo/expo/pull/11344) by [@tsapeta](https://github.com/tsapeta))

### 🐛 Bug fixes

- Remove Expo.AppLoading reference in error. ([#11204](https://github.com/expo/expo/pull/11204) by [@brentvatne](https://github.com/brentvatne))
- Removed `fbjs` dependency ([#11396](https://github.com/expo/expo/pull/11396) by [@cruzach](https://github.com/cruzach))

## 8.4.0 — 2020-11-17

_This version does not introduce any user-facing changes._

## 8.3.0 — 2020-08-18

_This version does not introduce any user-facing changes._

## 8.2.2 — 2020-07-27

### 🐛 Bug fixes

- Fixed fonts not being loaded in Internet Explorer. ([#8652](https://github.com/expo/expo/pull/8652) by [@d4rky-pl](https://github.com/d4rky-pl))

## 8.2.1 — 2020-05-29

_This version does not introduce any user-facing changes._

## 8.2.0 — 2020-05-27

_This version does not introduce any user-facing changes._

## 8.1.1 - 4/07/2020

### 🐛 Bug fixes

- Fixed timeout on Firefox [#7420](https://github.com/expo/expo/pull/7420)
