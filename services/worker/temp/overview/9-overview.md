# Project Overview: 9

## 📋 Overview
This project is a Spring Boot-based API designed to receive financial transactions and calculate statistics in real-time, developed as a solution to the Itaú Unibanco programming challenge. The main purpose is to create a REST API that can handle transactions and provide statistical data.

## 🏗️ Architecture
**Style:** Monolith

The project follows a monolithic architecture, with a single Spring Boot application handling all aspects of the API, including receiving transactions, calculating statistics, and storing data in memory. The data flow is straightforward, with the `TransacaoController` handling incoming requests, the `TransacaoService` performing business logic, and the data being stored in memory for real-time statistics calculation.

## ✅ Strengths
- The project effectively utilizes Spring Boot for rapid development and deployment of the API.
- The API is well-documented with clear endpoint descriptions and example responses.
- The use of Java and Spring Boot ensures a robust and scalable application.

## ⚠️ Areas for Improvement
- The lack of a database for persistent storage is a significant limitation, as all data is lost when the application restarts.
- There is no implementation of automated testing, which is crucial for ensuring the reliability and stability of the application.
- The absence of configuration options for the statistics calculation period limits the flexibility of the application.

## 📊 Maturity Level
**Level:** MVP

The project is considered a Minimum Viable Product (MVP) because it provides the basic functionality required by the challenge but lacks key features such as persistent storage, automated testing, and configuration options that would make it production-ready.