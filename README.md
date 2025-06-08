**NoBS.email**
================

A tool to extract structured data from emails using AI.

**Table of Contents**
-----------------

* [Overview](#overview)
* [Tech Stack](#tech-stack)
* [System Architecture](#system-architecture)
* [Key Features](#key-features)
* [Code Structure](#code-structure)
* [Setup and Installation](#setup-and-installation)

**Overview**
------------

NoBS.email is a web application that allows users to extract structured data from emails using AI. The application uses a unique email address to receive emails, which are then processed and stored in a database.

**Tech Stack**
--------------

* **Frontend:** Preact + Tailwind/shadcn
* **Backend:** Astro
* **Email Processing:** Postmark (inbound and outbound)
* **Database:** Pocketbase
* **Hosting:** Coolify
* **AI (email data extraction):** Gemini Pro Flash2.5 (through OpenRouter)

**System Architecture**
----------------------

The system architecture is as follows:

1. User sends an email to their unique NoBS.email address (e.g., `john+ai@nobs.email`).
2. Postmark receives the email and calls a webhook on the NoBS.email backend.
3. The webhook parses the email data, extracts the username and database, and validates the user and database.
4. The email data is saved to the database, and the AI is used to extract structured data from the email contents.
5. The extracted data is inserted into the relevant collections.

**Key Features**
----------------

* **Email data extraction:** AI-powered extraction of structured data from emails.
* **Customizable collections:** Users can define their own collections to store extracted data.
* **Database separation:** Users can separate data into different databases using email aliases (e.g., `john+ai@nobs.email` and `john+work@nobs.email`).

**Setup and Installation**
---------------------------

To set up and install NoBS.email, follow these steps:

1. Clone the repository: `git clone https://github.com/janezgec/nobs-email.git`
2. Install dependencies: `npm install`
3. Configure Postmark and Pocketbase settings in the `.env` file.
4. Start the application: `npm run dev`
