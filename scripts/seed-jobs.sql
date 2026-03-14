-- Seed 10 realistic fintech/banking jobs for Fintech Commons
-- Run this in Supabase SQL Editor after creating the tables

-- Also ensure required columns exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS standout_perks TEXT[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_name TEXT;

-- Create warm_intros table
CREATE TABLE IF NOT EXISTS warm_intros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO jobs (title, company, location, country, description, summary, apply_url, company_url, company_logo_url, source_type, source_name, status, posted_date, expires_at, submission_ref, submitter_name, submitter_email, tags, standout_perks, warm_intro_ok) VALUES

-- 1. Stripe
(
  'Senior Backend Engineer, Payments',
  'Stripe',
  'Toronto, ON',
  'Canada',
  'We are looking for a Senior Backend Engineer to join our Payments team. You will design and build the systems that move money for millions of businesses worldwide. You will work on low-latency, high-reliability distributed systems that process billions of dollars annually. Experience with Ruby, Java, or Go required. Strong understanding of payment networks (Visa, Mastercard, ACH) is a plus.',
  'You''d be building the pipes that move real money for millions of businesses. Think low-latency distributed systems processing billions — not CRUD apps. If you know payment rails (Visa, Mastercard, ACH), even better. Day-to-day is Ruby/Java/Go, working with a team that ships fast and breaks nothing.',
  'https://stripe.com/jobs/search?query=senior+backend+engineer',
  'https://stripe.com',
  'https://logo.clearbit.com/stripe.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '28 days',
  'CJ-STRIPE01',
  'Alex Chen', 'alex@example.com',
  ARRAY['Engineering', 'example'],
  ARRAY['Remote-first', 'Equity for all employees', '$10K annual learning budget', 'Paid sabbatical after 5 years'],
  true
),

-- 2. Wealthsimple
(
  'Staff Data Engineer',
  'Wealthsimple',
  'Toronto, ON',
  'Canada',
  'Wealthsimple is looking for a Staff Data Engineer to lead our data platform evolution. You will architect and build the pipelines that power investment decisions for over 3 million Canadians. Tech stack includes Python, Spark, dbt, Snowflake, and Airflow. You will mentor junior engineers and set technical direction for the data org.',
  'You''d own the data platform that powers investment decisions for 3M+ Canadians. Think Spark, dbt, Snowflake — the real data stack, not just dashboards. You''ll mentor the team and set technical direction. It''s a staff-level role so expect architecture decisions, not just writing transforms.',
  'https://www.wealthsimple.com/en-ca/careers',
  'https://www.wealthsimple.com',
  'https://logo.clearbit.com/wealthsimple.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  'CJ-WEALTH01',
  'Priya Sharma', 'priya@example.com',
  ARRAY['Engineering', 'example'],
  ARRAY['4-day work week pilot', 'Remote across Canada', '$5K wellness budget', 'Stock options'],
  true
),

-- 3. Plaid
(
  'Product Manager, Open Banking',
  'Plaid',
  'San Francisco, CA',
  'United States',
  'Plaid is hiring a Product Manager to drive our Open Banking initiatives. You will define the product strategy for how banks and fintechs connect through our APIs. This role requires deep understanding of financial regulations, API design, and developer experience. 5+ years PM experience required, fintech preferred.',
  'You''d be the person deciding how banks and fintechs talk to each other through Plaid''s APIs. It''s a regulatory-meets-product role — you need to understand both the compliance landscape and what makes developers actually want to integrate. Not a feature factory PM gig.',
  'https://plaid.com/careers/',
  'https://plaid.com',
  'https://logo.clearbit.com/plaid.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '27 days',
  'CJ-PLAID001',
  'Jordan Lee', 'jordan@example.com',
  ARRAY['Product', 'example'],
  ARRAY['Hybrid (2 days office)', 'Top-tier health coverage', 'Annual team offsite', 'Generous equity refresh'],
  false
),

-- 4. Nubank
(
  'Mobile Engineer (iOS), Consumer App',
  'Nubank',
  'São Paulo / Remote',
  'Brazil',
  'Join Nubank, Latin America''s largest digital bank with 90M+ customers. We are looking for an iOS engineer to work on our consumer banking app. You will build features used by tens of millions daily. Swift and SwiftUI experience required. We use a microservices architecture with Clojure on the backend.',
  'You''d be shipping features to 90M+ people across Latin America — that''s not a typo. Nubank is the biggest digital bank in the region. Day-to-day is Swift/SwiftUI on the consumer app. Backend is Clojure (yes, really) with microservices. Scale is insane.',
  'https://nubank.com.br/en/careers/',
  'https://nubank.com.br',
  'https://logo.clearbit.com/nubank.com.br',
  'direct', 'community', 'active',
  NOW() - INTERVAL '4 days',
  NOW() + INTERVAL '26 days',
  'CJ-NUBANK01',
  'Maria Santos', 'maria@example.com',
  ARRAY['Engineering', 'Remote', 'example'],
  ARRAY['Fully remote option', 'NuCare mental health program', 'Equity participation', 'Meal and transport allowance'],
  true
),

-- 5. Coinbase
(
  'Senior Security Engineer, Blockchain',
  'Coinbase',
  'Remote (US)',
  'United States',
  'Coinbase is looking for a Senior Security Engineer to protect digital assets for 100M+ users. You will work on smart contract auditing, blockchain security, and infrastructure hardening. Experience with Ethereum, Solidity, and common attack vectors (reentrancy, front-running) required. Cryptography background is a strong plus.',
  'You''d be protecting real money — crypto assets for 100M+ users. Think smart contract audits, hunting for reentrancy bugs, front-running exploits. If you know Solidity security and have a cryptography background, this is the role. Not just compliance checkbox security.',
  'https://www.coinbase.com/careers',
  'https://www.coinbase.com',
  'https://logo.clearbit.com/coinbase.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '25 days',
  'CJ-COINB001',
  'Sam Rivera', 'sam@example.com',
  ARRAY['Engineering', 'Remote', 'example'],
  ARRAY['Fully remote', '$5K home office budget', 'Quarterly crypto bonus', 'Unlimited PTO (actually used)'],
  false
),

-- 6. Revolut
(
  'Risk Analyst, Financial Crime',
  'Revolut',
  'London, UK',
  'United Kingdom',
  'Revolut is hiring a Risk Analyst to join our Financial Crime team. You will analyze transaction patterns, build detection models, and work with regulators across 35+ markets. SQL and Python required. Experience with AML/KYC frameworks, sanctions screening, and suspicious activity reporting preferred. Fast-paced environment.',
  'You''d be hunting money launderers and financial criminals across 35+ markets. Not a boring compliance desk — you''ll build detection models, analyze transaction patterns, and work directly with regulators. SQL and Python daily. If you know AML/KYC, you''re ahead.',
  'https://www.revolut.com/careers/',
  'https://www.revolut.com',
  'https://logo.clearbit.com/revolut.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  'CJ-REVOL001',
  'Elena Volkov', 'elena@example.com',
  ARRAY['Operations', 'example'],
  ARRAY['Hybrid flex (London)', 'Free Revolut Metal plan', 'Stock options', 'Learning budget'],
  true
),

-- 7. Square (Block)
(
  'Full Stack Engineer, Cash App',
  'Block (Cash App)',
  'New York, NY',
  'United States',
  'Cash App is looking for a Full Stack Engineer to build features that help millions of people manage their money. You will work across the stack with React Native on mobile, React on web, and Kotlin/Java on backend services. We process peer-to-peer payments, bitcoin transactions, and banking features.',
  'Cash App isn''t just P2P payments anymore — it''s bitcoin, banking, investing, all in one. You''d work across the full stack: React Native mobile, React web, Kotlin backend. The scale is real (50M+ monthly users) and the features ship fast.',
  'https://block.xyz/careers',
  'https://block.xyz',
  'https://logo.clearbit.com/block.xyz',
  'direct', 'community', 'active',
  NOW() - INTERVAL '6 days',
  NOW() + INTERVAL '24 days',
  'CJ-BLOCK001',
  'David Kim', 'david@example.com',
  ARRAY['Engineering', 'example'],
  ARRAY['Hybrid flexible', 'Bitcoin matching program', 'Generous parental leave', 'Annual wellness stipend'],
  true
),

-- 8. Wise (TransferWise)
(
  'Engineering Manager, International Payments',
  'Wise',
  'Tallinn, Estonia / Remote EU',
  'Estonia',
  'Wise is hiring an Engineering Manager to lead a team of 8-10 engineers building international payment infrastructure. You will own the systems that move money across 80+ countries and 50+ currencies. Strong technical background required — you will do code reviews and make architectural decisions alongside people management.',
  'You''d lead 8-10 engineers building the pipes that move money across 80+ countries in 50+ currencies. This is a hands-on EM role — code reviews, architecture decisions, not just meetings. Wise moves real volume ($12B+ quarterly) with razor-thin margins, so every optimization matters.',
  'https://www.wise.com/careers/',
  'https://www.wise.com',
  'https://logo.clearbit.com/wise.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '27 days',
  'CJ-WISE0001',
  'Katrin Tamm', 'katrin@example.com',
  ARRAY['Engineering', 'Remote', 'example'],
  ARRAY['Remote across EU', 'Wise shares (RSUs)', 'Relocation support', 'No-meeting Wednesdays'],
  false
),

-- 9. Robinhood
(
  'Machine Learning Engineer, Fraud Detection',
  'Robinhood',
  'Menlo Park, CA',
  'United States',
  'Robinhood is looking for a Machine Learning Engineer to build real-time fraud detection models. You will work on models that analyze millions of transactions per day to detect unauthorized access, account takeovers, and payment fraud. Experience with Python, PyTorch/TensorFlow, and real-time ML serving required.',
  'You''d build ML models that catch fraud in real-time across millions of daily transactions. Think account takeovers, unauthorized trades, payment fraud — the stakes are real money. PyTorch/TensorFlow, real-time serving, and you''ll see your models protecting actual people''s portfolios.',
  'https://robinhood.com/careers/',
  'https://robinhood.com',
  'https://logo.clearbit.com/robinhood.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '28 days',
  'CJ-ROBIN001',
  'James Park', 'james@example.com',
  ARRAY['Engineering', 'example'],
  ARRAY['Hybrid (3 days office)', 'Free Robinhood Gold', 'Competitive equity', '401k match'],
  true
),

-- 10. Affirm
(
  'Senior Frontend Engineer, Merchant Experience',
  'Affirm',
  'Remote (US / Canada)',
  'United States',
  'Affirm is hiring a Senior Frontend Engineer to build the merchant-facing dashboard and integration tools. You will work on the platform that powers buy-now-pay-later for thousands of merchants. React, TypeScript, and GraphQL experience required. You will also contribute to our shared component library and design system.',
  'You''d build the tools that merchants use to integrate Affirm''s BNPL into their checkout. React + TypeScript + GraphQL — clean modern stack. You''ll also shape the design system and component library. It''s the B2B side of BNPL, which means fewer flashy animations but more interesting data problems.',
  'https://www.affirm.com/careers',
  'https://www.affirm.com',
  'https://logo.clearbit.com/affirm.com',
  'direct', 'community', 'active',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '29 days',
  'CJ-AFFIRM01',
  'Rachel Torres', 'rachel@example.com',
  ARRAY['Engineering', 'Remote', 'example'],
  ARRAY['Fully remote (US/Canada)', '$1.5K quarterly WFH stipend', 'Affirm equity', '18 weeks parental leave'],
  true
);
