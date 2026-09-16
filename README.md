# Release Health Radar

An Expo dashboard that combines a simulated mobile-release model with live engineering signals from the open-source [`expo/expo`](https://github.com/expo/expo) repository.

The app models a small data product that answers one mobile-platform question:

> Did this EAS Update release make the app healthier or riskier?

## What it demos

- Expo and React Native UI
- Mock EAS release telemetry
- Crash-rate and baseline comparison
- Data-quality checks for schema errors, duplicates, and late events
- Explainable rollout recommendations
- Live repository, commit, and GitHub Actions data from `expo/expo`
- A mobile-first dashboard that can be demoed in under two minutes

## Data sources

The **Health**, **Anomalies**, and **Pipeline** views use a small synthetic telemetry fixture defined in `App.tsx`. It represents the production data a real system would receive from EAS Update metadata plus an app-observability provider.

The **Expo OSS** view fetches live public data directly from GitHub with no stored token:

- `GET /repos/expo/expo`
- `GET /repos/expo/expo/actions/runs`
- `GET /repos/expo/expo/commits`

The app calculates recent CI success rate in the client and links each workflow run and commit back to its source on GitHub. If GitHub is unavailable or rate-limited, the UI shows an explicit error instead of presenting fixture data as live.

## Run it

```bash
npm install
npm run web
```

For iOS or Android:

```bash
npm run ios
npm run android
```
