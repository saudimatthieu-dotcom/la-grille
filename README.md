# La Grille

![CI](https://github.com/saudimatthieu-dotcom/la-grille/actions/workflows/ci.yml/badge.svg)

A mobile app for sports predictions between friends: no money involved, just for fun and the ranking.

Every week, players predict the results of real matches, earn points when they are right, and compete in private leagues with their friends or in the public league open to everyone.

## Features

- **Weekly grids of real matches** across many sports: football (Ligue 1, Ligue 2, Premier League, Liga, Serie A, MLS, Women's Super League, Champions League, Europa League, Conference League, Nations League, Coupe de France), basketball (NBA, Betclic Élite), rugby (Top 14, Premiership, Six Nations), handball (Starligue), American sports (NFL, NHL, MLB) and Formula 1
- **Several kinds of predictions**: match result, over/under on the total score (basketball, rugby, handball, NFL, NHL, MLB), F1 podium
- **Leagues**: private leagues joined with an invite code, plus a public league for every player
- **Rankings**: weekly, monthly and overall, with seasons and a podium at the end of each season
- **Bonuses and sabotage**: double your points, protect a prediction, or sabotage a rival
- **League chat** with a word filter for moderation
- **Push notifications**: new grid, grid closing soon, results, chat messages (each can be switched off)
- **Admin tools**: admins choose the matches of each week's grid
- **Automatic scoring**: matches and results are imported from sports APIs

## Stack

| Part     | Technologies |
| -------- | ------------ |
| Mobile   | Expo, React Native, TypeScript, React Navigation, Redux Toolkit, redux-persist, expo-notifications |
| Backend  | Express, TypeScript, MongoDB (Mongoose), bcrypt, uid2 |
| Tests    | Jest, 140 tests (scoring, rankings, bonuses, seasons, moderation, notifications), run with the type checks by GitHub Actions on every push |
| Data     | [TheSportsDB](https://www.thesportsdb.com) (football, basketball, rugby, handball, American sports), [Jolpica F1](https://github.com/jolpica/jolpica-f1) (Formula 1) |
| Hosting  | Render (API), EAS Build (Android app) |

## Structure

```
la-grille/
├── backend/
│   ├── routes/       users, leagues, grids, predictions, tactics, messages, picks, admin
│   ├── models/       Mongoose schemas
│   ├── modules/      game logic (scoring, ranking, bonuses, seasons…) and its tests
│   ├── providers/    sports data APIs
│   └── config/       competitions, avatars, word filter
└── frontend/
    ├── screens/      one file per screen
    ├── components/   reusable UI (grid, ranking, chat, bonus bar…)
    ├── reducers/     Redux store
    └── config/       sports, bonuses, notification settings
```

## Getting started

**Backend**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Environment variables:

| Variable            | Description |
| ------------------- | ----------- |
| `CONNECTION_STRING` | MongoDB connection string |
| `PORT`              | API port (default `3000`) |
| `ADMIN_SECRET`      | secret for the admin and cron routes |
| `THESPORTSDB_KEY`   | TheSportsDB API key — optional, defaults to the free test key `123` (the old `3` is disabled) |
| `TZ`                | `Europe/Paris` on the host — weeks start Monday 00:00 and "Nouvelle grille" goes out at 8:00 in this time zone |
| `BREVO_API_KEY`     | Brevo API key for the "forgot password" emails — without it the code is printed in the server logs |
| `MAIL_FROM`         | sender address of those emails, verified in Brevo (Senders & IP → Senders) |
| `ADS_TEST_REWARDS`  | `true` = the app may grant the ad doubleur after Google's **test** ads (which never call the server). Keep `false` once real ads are live |

Run the tests with `npm test`.

**Mobile app**

```bash
cd frontend
npm install
cp .env.example .env   # set EXPO_PUBLIC_BACKEND_ADRESS to your machine's IP
npx expo start
```

Push notifications need a development build (`expo-dev-client`), not Expo Go.

## Ads (AdMob)

Banners on Accueil and Grille, and a rewarded video in the bonus bar (+1 Doubleur per league per week). VIP members see no banner.
Until the steps below are done, the app shows Google's **test** ads.

1. Create the app in the [AdMob console](https://admob.google.com) (Android, then iOS), and two ad units: an **adaptive banner** and a **rewarded** one.
2. Replace Google's test app ids in `frontend/app.json` (`react-native-google-mobile-ads` plugin) with La Grille's, then rebuild the app.
3. Put the ad unit ids in the EAS `preview` environment: `EXPO_PUBLIC_ADMOB_BANNER_ID`, `EXPO_PUBLIC_ADMOB_REWARDED_ID`.
4. On the rewarded ad unit: **Server-side verification** → callback URL `https://la-grille-api.onrender.com/ads/reward`. The doubleur is only granted when Google calls this URL with a valid signature.
5. **Privacy & messaging** → create a **GDPR** message (consent form shown to players in Europe).
6. **Blocking controls** → block the sensitive categories *Gambling & betting*, *Dating*, and adult content (the app already caps ads at PG).
7. AdMob only serves real ads to apps published on Google Play / the App Store, with an `app-ads.txt` file on the app's website.

## Data licences

Formula 1 data comes from Jolpica F1 under CC BY-NC-SA 4.0 (non-commercial use).
