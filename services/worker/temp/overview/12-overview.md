# Project Overview: 12

## 📋 Overview
This project is a Spring Boot-based API designed to receive financial transactions and calculate statistics in real-time, developed as a solution to the Itaú Unibanco programming challenge. The main purpose is to create a REST API that can handle transactions and provide statistical data.

## 🏗️ Architecture
**Style:** Monolith

The project follows a monolithic architecture, with a single Spring Boot application handling all aspects of the API, including receiving transactions, calculating statistics, and storing data in memory. The data flow is straightforward, with the `TransacaoController` handling incoming requests, and the `TransacaoService` performing the business logic.

## ✅ Strengths
- The project effectively utilizes Spring Boot to simplify the development process and provide a robust framework for building the API.
- The API documentation in the README.md file is clear and concise, making it easier for users to understand how to interact with the API.
- The project includes a basic implementation of statistical calculation, which can be further expanded upon.

## ⚠️ Areas for Improvement
- The project lacks a database, relying on in-memory storage, which can lead to data loss in case of application restarts or failures.
- There is no implementation of automated testing, which is crucial for ensuring the reliability and stability of the API.
- The API does not include any form of authentication or authorization, which can pose security risks.

## 📊 Maturity Level
**Level:** Prototype

The project is assessed as a prototype due to its limited functionality, lack of database persistence, and absence of automated testing, which are all essential components of a production-ready application.