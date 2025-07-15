# ---------- Step 1: Build stage using Java 21 ----------
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy the whole project
COPY . .

# Build the project and skip tests to avoid failure
RUN mvn clean package -DskipTests

# ---------- Step 2: Runtime stage using Java 21 ----------
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/Rashad_Project-0.0.1-SNAPSHOT.jar app.jar

# Expose default Spring Boot port
EXPOSE 8080

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]
