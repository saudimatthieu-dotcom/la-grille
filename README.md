# La Grille

A mobile app for sports predictions between friends: no money involved, just for fun and the ranking.

Every week, players predict the results of real matches, earn points when they are right, and compete in private leagues with their friends or in the public league open to everyone.

## Features

- **Weekly grids of real matches**: football (Ligue 1, Premier League, Liga, Serie A), basketball (NBA, Betclic Élite), rugby (Top 14, Premiership) and Formula 1
- **Several kinds of predictions**: match result, over/under on the total score, F1 podium
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
| Tests    | Jest (scoring, rankings, bonuses, seasons, moderation, notifications) |
| Data     | [TheSportsDB](https://www.thesportsdb.com) (football, basketball, rugby), [Jolpica F1](https://github.com/jolpica/jolpica-f1) (Formula 1) |
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
| `THESPORTSDB_KEY`   | TheSportsDB API key |

Run the tests with `npm test`.

**Mobile app**

```bash
cd frontend
npm install
cp .env.example .env   # set EXPO_PUBLIC_BACKEND_ADRESS to your machine's IP
npx expo start
```

Push notifications need a development build (`expo-dev-client`), not Expo Go.

## Data licences

Formula 1 data comes from Jolpica F1 under CC BY-NC-SA 4.0 (non-commercial use).
