# syntax=docker/dockerfile:1.7

##
## Build stage
##
FROM gradle:8.10-jdk21-alpine AS build

WORKDIR /workspace/api

COPY ./ ./

RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

##
## Runtime stage
##
FROM eclipse-temurin:21-jre-alpine AS runtime

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
WORKDIR /app

COPY --from=build /workspace/api/build/libs/*.jar app.jar

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java","-jar","/app/app.jar"]
