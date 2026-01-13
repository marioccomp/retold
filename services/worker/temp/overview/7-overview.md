# Project Overview: 7

## 📋 Overview
This project is a Spring Boot-based API designed to receive financial transactions and calculate statistics in real-time, developed as a solution to the Itaú Unibanco programming challenge. The main purpose is to create a REST API that can handle transactions and provide statistical data.

## 🏗️ Architecture
**Style:** Monolith

The project uses a monolithic architecture, with a single Spring Boot application handling all the business logic, data storage, and API endpoints, and data is stored in memory without a database.

## ✅ Strengths
- The project is well-structured and follows standard Spring Boot practices.
- It has a clear and concise API documentation in the README file.
- The code is readable, and the use of Java and Spring Boot makes it easy to maintain and extend.

## ⚠️ Areas for Improvement
- The project lacks automated tests, which is crucial for ensuring the reliability and stability of the API.
- There is no configuration for changing the calculation period, which is currently hardcoded to 60 seconds.
- The project could benefit from the addition of logging and performance monitoring to improve its maintainability and scalability.

## 📊 Maturity Level
**Level:** MVP

The project is considered a Minimum Viable Product (MVP) because it has a basic implementation of the required functionality, but it still lacks some essential features, such as automated tests and logging, to be considered production-ready.