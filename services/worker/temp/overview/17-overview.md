# Project Overview: 17

## 📋 Overview
This project is a backend challenge solution using Spring Boot, aiming to provide an API for managing points of interest (POIs) based on GPS coordinates. The main purpose is to allow users to register, list, and search for POIs within a specified distance.

## 🏗️ Architecture
**Style:** Monolith
The project follows a monolithic architecture, with Spring Boot as the primary framework, utilizing Spring Data JPA for database interactions and an in-memory H2 database for storage. The API endpoints are designed to handle CRUD operations and proximity searches for POIs.

## ✅ Strengths
- The project effectively utilizes Spring Boot for rapid development and deployment of the backend API.
- It incorporates Spring Data JPA for simplified database operations, reducing boilerplate code.
- The inclusion of an in-memory H2 database facilitates easy setup and testing of the application.

## ⚠️ Areas for Improvement
- The project lacks Docker support, which could enhance deployment flexibility and consistency across different environments.
- There is no Continuous Integration (CI) pipeline implemented, which is crucial for automating tests, builds, and deployments.
- The absence of linting tools may lead to inconsistencies in code quality and formatting.

## 📊 Maturity Level
**Level:** MVP
The project is considered a Minimum Viable Product (MVP) because it provides the core functionality required for the backend challenge but lacks certain features and tools (like Docker, CI, and linting) that would make it production-ready.