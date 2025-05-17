# Roadmap for Harvard Campus Tour WebApp

This document provides a high-level overview of the proposed AI-driven mobile web application that guides users through Harvard Yard. It outlines the core objectives, essential features, and project phases without prescribing overly specific implementation details or timelines.

---

## Project Goal

Enable visitors and students to explore Harvard Yard through an intuitive, chat-based interface layered on an interactive map. The app will deliver contextual information, answer questions about landmarks, and offer a seamless mobile experience.

---

## Core Features

1. **Geolocation & Mapping**  
   - Detect and display the user’s current position on a map. The map should look cute, almost like a drawn map of Harvard Yard. It doesn't need to be a map of the whole world -- Harvard Sq. should cover it.
   - Show clickable landmarks and points of interest.
   - Provide manual selection for users who decline location access.

2. **Chat Interface**  
   - Present a conversational UI for users to ask about nearby buildings or campus history.  
   - Support predefined intents (e.g., hours, history, fun facts) and free-form questions.

3. **Landmark Data**  
   - Maintain a structured source of campus landmarks, including names, descriptions, images, and relevant metadata.  
   - Allow for easy expansion of the dataset.
   - RAG data retrieval

4. **AI Integration**  
   - Leverage a language model to generate or enrich responses beyond static content.  
   - Ensure responses remain accurate by grounding them with landmark data.
   - Ignore irrelevant requests / questions. Keep aware of context.

5. **User Engagement & Feedback**  
   - Offer quick-reply suggestions or buttons to guide interactions.  

6. **Responsive Design**  
   - Optimize and design primarily for mobile browsers (iOS Safari, Android Chrome).  
   - Ensure touch-friendly controls, readable text, and fast load times.

---

## High-Level Phases

1. **Foundation Setup**  
   - Initialize project structure and dependency management.  
   - Establish environment configuration and deployment pipeline.

2. **Data & Map Integration**  
   - Define data model for landmarks.
   - Integrate mapping library and display basic markers. Make sure to make the design cute and friendly.

3. **Chat & Interaction Layer**  
   - Build chat UI and intent-handling logic.  
   - Connect chat actions to landmark data queries.

4. **Enhanced AI Capabilities**  
   - Add AI-driven responses for natural interaction.  
   - Implement prompt engineering and data grounding.
   - Conversational AI would be best, with voice input option (optional)

5. **Deployment & Quality Assurance**  
   - Deploy to a hosting platform with basic monitoring.
  
6. **Iteration & Expansion**  (don't need to worry about this)
   - Expand landmark dataset and refine UX based on user feedback.
---