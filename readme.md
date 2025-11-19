# Telegram Bot (Node.js + Telegraf + MongoDB)

A production-ready Telegram bot using Node.js, Telegraf, and MongoDB (Mongoose). Implements user and admin features: registration, phone collection, channel subscription verification, points, rewards, leaderboard, admin broadcasts, and more.

## Features

- User registration with name and phone (via Telegram contact).
- Channel subscription check (uses `getChatMember`, bot must be admin in channels).
- Points and rewards system with atomic operations (Mongo transactions).
- Admin dashboard (search users, add/remove points, grant/remove rewards, broadcast, statistics).
- Clean modular code structure, async/await, proper try/catch, and logging.

## Requirements

- Node.js 18+
- MongoDB (replica set recommended for transactions; Atlas works well)
- Telegram bot token
- Bot should be admin in channels you want to verify membership for.

## Setup

1. Clone repository and `cd` into it.
2. Install:
   ```bash
   npm install
