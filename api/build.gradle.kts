plugins {
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    id("java")
    id("groovy")
    id("jvm-test-suite")
}

group = "com.highschoolhowto"
version = "0.0.1-SNAPSHOT"

val spockVersion = "2.3-groovy-4.0"
val testcontainersVersion = "1.20.3"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("com.azure:azure-identity:1.14.0")
    implementation("com.microsoft.graph:microsoft-graph:5.77.0")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.liquibase:liquibase-core")
    implementation("org.postgresql:postgresql")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    implementation("com.nimbusds:nimbus-jose-jwt:9.37.3")
}

tasks.named<Test>("test") {
    useJUnitPlatform()
}

testing {
    suites {
        val test by getting(JvmTestSuite::class) {
            useJUnitJupiter()
            dependencies {
                implementation("org.springframework.boot:spring-boot-starter-test")
                implementation("com.h2database:h2")
                implementation("org.spockframework:spock-spring:$spockVersion")
            }
        }

        val integTest by registering(JvmTestSuite::class) {
            useSpock()
            dependencies {
                implementation(project())
                implementation("org.springframework.boot:spring-boot-starter-test")
                implementation("com.h2database:h2")
                implementation("org.spockframework:spock-spring:$spockVersion")
                implementation("org.springframework.boot:spring-boot-testcontainers")
                implementation("org.testcontainers:testcontainers:$testcontainersVersion")
                implementation("org.testcontainers:junit-jupiter:$testcontainersVersion")
                implementation("org.testcontainers:postgresql:$testcontainersVersion")
            }
            targets {
                all {
                    testTask.configure {
                        shouldRunAfter(tasks.named("test"))
                    }
                }
            }
        }
    }
}

tasks.named("check") {
    dependsOn(tasks.named("integTest"))
}

configurations.named("integTestImplementation") {
    extendsFrom(configurations.getByName("testImplementation"))
}

configurations.named("integTestRuntimeOnly") {
    extendsFrom(configurations.getByName("testRuntimeOnly"))
}
