# TypeSoFast!

TypeSoFast is a 10fastfingers clone for you to test your typing speed in Indonesian, built with Next.js and TypeScript.

## Modes

1. **Solo** : Type as many words as you can before time runs out and track your personal bests.
2. **vs Computer (PvC)** : Race against a computer opponent to see who types faster.
3. **vs Player (PvP)** : Quick match against a random opponent via matchmaking and race to see who types faster.

## Other features

- **Leaderboard**: Global rankings by duration and mode, plus a weekly leaderboard.
- **Achievements**: Unlockable achievements based on your typing performance.
- **Stats**: WPM history, key heatmap, accuracy breakdown, and daily streaks.
- Sign in with AccelByte Gaming Services (AGS) to sync your records, achievements, and leaderboard entries to the cloud.

## Definitions you might wanna know

1. WPM : 5 correct keystrokes is counted as 1 word per minute
2. Keystroke: Every character you type counted as 1 keystroke. Special keys like Ctrl, Shift, Tab, Esc, doesn't count
3. Accuracy: Correct keystrokes / (Total keystrokes + how many times you press Backspace key)

## About the vocab

I collected words in the vocab from news articles available in [Kompas.com](https://kompas.com) and [Kumparan.com](https://kumparan.com). You can see some typos, slangs, or even foreign words. If you want to add more words or fix some incorrect words, feel free to fork, edit words.ts file in the constants folder, and pull request to this project.

## Development

```bash
npm run dev      # start the dev server
npm run lint     # lint with oxlint
npm run test:unit # run unit tests with vitest
npm run test:e2e  # run end-to-end tests with playwright
```
