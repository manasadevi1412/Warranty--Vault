# AISEHack Presentation Guide: Warranty Vault

This document outlines the structured 7-minute presentation script and preparation details for **Warranty Vault**. The roles and timings are balanced across **Abhiprithi**, **Manasa**, and **Kamlika** to deliver a highly professional and coordinated pitch to the hackathon mentors.

---

## ⏱️ Quick Presentation Summary

| Part | Section | Duration | Speaker(s) | Focus |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Project Overview | 2 Minutes | Abhiprithi | Problem, Solution, and Core Value |
| **2** | Prototype Demonstration | 3 Minutes | Manasa & Kamlika | Live demo of OAuth, Gemini AI, Dashboard, and FCM |
| **3** | Q&A Session | 2 Minutes | All Members | Expert responses to mentor questions |

---

## 🎤 Presentation Script

### Part 1: Project Overview (0:00 - 2:00)
**Speaker: Abhiprithi**

* **[0:00 - 0:40] The Problem Hook**
  > **Abhiprithi:** "Good morning, mentors. Let me ask you: How many times have you bought an appliance or a gadget, put the warranty card somewhere 'safe,' and when it broke a year later, you couldn't find the receipt? Or worse, you found it, but the ink had completely faded? Every year, consumers lose billions of dollars in unclaimed repairs just because managing physical warranties is outdated, messy, and frustrating."

* **[0:40 - 1:20] Introducing Warranty Vault**
  > **Abhiprithi:** "To solve this, our team built **Warranty Vault**—an intelligent, AI-powered digital locker for all your warranties. Our app completely automates the process: you upload a photo of your warranty card, our AI reads it, extracts all necessary info, hosts it securely in the cloud, and proactively pushes reminders to your devices before the warranty expires."

* **[1:20 - 2:00] Architecture & Team Intro**
  > **Abhiprithi:** "To make this happen, we built a modern stack using Next.js, MongoDB, AWS S3, Google Gemini, and Firebase. Now, my teammate **Manasa** will take you through the live prototype to show you how the AI magic works."

---

### Part 2: Prototype Demonstration (2:00 - 5:00)
**Speakers: Manasa & Kamlika**

* **[2:00 - 2:45] Live Upload & Sign-in**
  > **Manasa:** "Thank you, Abhiprithi. Here is our live application. The user logs in securely using **Google OAuth**. Once authenticated, they are greeted by their dashboard. Now, let’s upload a new warranty. I will select an image of a warranty card from my device. Notice that the user doesn’t need to fill in a single input field manually."

* **[2:45 - 3:30] The AI Extraction (Google Gemini)**
  > **Manasa:** "Once uploaded, our system streams the image to the **Google Gemini API**. Gemini reads the image, understands the context, and extracts the brand, product name, serial number, and purchase date. Best of all, if the card only mentions '2 years warranty', the AI automatically computes the exact expiry date from the purchase date. Everything is pre-filled. Now, we click save, storing the document securely in **AWS S3**."

* **[3:30 - 4:15] Dashboard & Call Actions**
  > **Kamlika:** "Once saved, as you can see on our dashboard, the warranty is added with visual status badges: 'Expired', 'Expiring Soon' (yellow), or 'Active' (green). We wanted to make claims effortless, so if a product breaks, the user doesn't need to search Google for support details. They can click the **Call** button to contact brand support with a single tap."

* **[4:15 - 5:00] FCM Push Reminders & Cron**
  > **Kamlika:** "Finally, the core feature: preventing expired warranties. We created a daily cron job that scans the database for upcoming expiries. It sends push notifications directly to the user's device using **Firebase Cloud Messaging**. Clicking the notification opens the app directly to the product detail page, asking the user if they've resolved the claim."

---

### Part 3: Q&A Session (5:00 - 7:00)
**Speakers: All Members (Coordinated Roles)**

To show strong teamwork, answers should be distributed based on each member's domain expertise:

#### 1. Business Value & User Experience Questions
* **Target Speaker:** **Abhiprithi**
* **Example Question:** *"How do you scale this or make money?"*
* **Response Guide:** 
  > *"We plan to partner with retail brands so they can register warranties digitally inside Warranty Vault right at checkout. We also want to offer premium features like extended warranty options and multi-device synchronization."*

#### 2. AI Model & Backend Architecture Questions
* **Target Speaker:** **Manasa**
* **Example Question:** *"How does the AI handle messy handwriting or low-quality photos?"*
* **Response Guide:** 
  > *"We integrated Gemini 2.5 Flash, which parses handwritten text and unstructured receipts natively using advanced multimodal capabilities. The backend is structured using Next.js API routes connected to a MongoDB database."*

#### 3. Cloud Storage & Notifications Questions
* **Target Speaker:** **Kamlika**
* **Example Question:** *"What security measures do you have in place for user documents?"*
* **Response Guide:** 
  > *"For security, document images are stored in private S3 buckets and accessed via temporary 7-day signed URLs. The push notification client is registered via a background Service Worker using Firebase Cloud Messaging."*

---

## 💡 Live Demo Preparation checklist

Before starting your pitch, make sure you complete this checklist to prevent live errors:
- [ ] **Start the local server:** Run `npm run dev` and test it locally at `http://localhost:3000`.
- [ ] **Verify database connection:** Ensure your local MongoDB instance or Atlas cluster is online.
- [ ] **Prepare backup tab:** Open a separate tab with a pre-loaded, completed dashboard. If the internet runs slow during the upload demo, you can instantly switch to this tab.
- [ ] **Log in in advance:** Make sure the Google OAuth authentication works smoothly in your demo browser.
