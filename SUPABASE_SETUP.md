# Supabase Setup Guide

This application has been migrated from PocketBase to Supabase. Follow these steps to set up your Supabase database:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create a new project
4. Note down your project URL and anon key

## 2. Set Up Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 3. Create Database Schema

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables and policies

## 4. Configure Row Level Security (RLS)

The schema includes RLS policies that ensure users can only access their own data. The policies are automatically created when you run the schema script.

## 5. Test the Application

1. Start the development server: `npm run dev`
2. Register a new user account
3. Test creating properties, loans, transactions, etc.

## Database Tables Created

- `properties` - Property information
- `loans` - Loan records
- `transactions` - Financial transactions
- `expenses` - Expense tracking
- `rentals` - Rental information
- `agents` - Agent contacts
- `user_settings` - User preferences and settings

## Features Migrated

- ✅ User authentication (register/login/logout)
- ✅ Property management
- ✅ Loan tracking
- ✅ Transaction recording
- ✅ Expense management
- ✅ Rental tracking
- ✅ Agent management
- ✅ User settings
- ✅ Real-time subscriptions
- ✅ Row Level Security

## Notes

- All data is now stored in Supabase PostgreSQL database
- Authentication is handled by Supabase Auth
- Real-time updates are available through Supabase Realtime
- Row Level Security ensures data privacy between users