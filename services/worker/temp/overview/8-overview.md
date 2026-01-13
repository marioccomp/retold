# Project Overview: 8

## 📋 Overview
This project is a backend challenge solution using Spring Boot, aiming to provide an API for managing points of interest (POIs) based on GPS coordinates. The main purpose is to allow users to register, list, and search for POIs within a specified distance.

## 🏗️ Architecture
**Style:** Monolith

The project follows a monolithic architecture, with Spring Boot as the primary framework, utilizing Spring Data JPA for database interactions and an in-memory H2 database for storage. The API endpoints handle CRUD operations and proximity searches for POIs.

## ✅ Strengths
- The project effectively utilizes Spring Boot for rapid development and deployment of the backend API.
- It incorporates Spring Data JPA for simplified database operations, reducing boilerplate code.
- The inclusion of an in-memory H2 database facilitates easy setup and testing.

## ⚠️ Areas for Improvement
- The lack of Docker support hinders containerization and scalability.
- Absence of CI/CD pipelines slows down the testing and deployment process.
- Limited testing, with only one test file, may not cover all scenarios and edge cases.

## 📊 Maturity Level
**Level:** MVP

The project is considered a Minimum Viable Product (MVP) due to its basic functionality and lack of advanced features, testing, and deployment strategies, but it still demonstrates a working solution to the posed challenge.