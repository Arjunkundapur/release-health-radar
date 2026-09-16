# Release Health Radar

An Expo demo project for a Data Engineer interview at Expo.

The app models a small data product that answers one mobile-platform question:

> Did this EAS Update release make the app healthier or riskier?

## What it demos

- Expo and React Native UI
- Mock EAS release telemetry
- Crash-rate and baseline comparison
- Data-quality checks for schema errors, duplicates, and late events
- Explainable rollout recommendations
- A mobile-first dashboard that can be demoed in under two minutes

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

## Interview pitch

"Since your work is in data engineering at Expo, I built a small release-health radar for Expo teams. Expo helps teams ship quickly with EAS Build and EAS Update, but after a rollout starts, teams need trustworthy data to decide whether to continue, pause, or roll back. This demo turns mobile telemetry into a health score, anomaly feed, data-quality panel, and rollout recommendation."

## Talking points

- Event schema design matters because bad telemetry creates false confidence.
- Rollout decisions should compare a release against platform-specific baselines.
- Late-arriving events and duplicates are part of the data-engineering problem, not just UI noise.
- Product-facing data should explain why it recommends an action.
