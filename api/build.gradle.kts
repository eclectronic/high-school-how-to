
plugins {
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
    id("java")
    id("groovy")
    id("jvm-test-suite")
    id("org.liquibase.gradle") version "2.2.0"
    id("com.google.cloud.tools.jib") version "3.4.2"
}

group = "com.highschoolhowto"
version = "7.0.3"

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
    implementation("software.amazon.awssdk:sesv2:2.29.52")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.liquibase:liquibase-core")
    implementation("org.postgresql:postgresql")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    implementation("com.nimbusds:nimbus-jose-jwt:9.37.3")
    implementation("software.amazon.awssdk:s3:2.29.52")
    implementation("net.coobird:thumbnailator:0.4.20")
    implementation("com.googlecode.owasp-java-html-sanitizer:owasp-java-html-sanitizer:20240325.1")

    liquibaseRuntime("org.liquibase:liquibase-core")
    liquibaseRuntime("org.postgresql:postgresql")
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

val awsAccountId = System.getenv("AWS_ACCOUNT_ID") ?: "123456789012"
val awsRegion = System.getenv("AWS_REGION") ?: "us-west-2"
val awsEcrRepo = System.getenv("AWS_ECR_REPO_NAME") ?: "highschoolhowto/api"
val awsImageTag = System.getenv("AWS_IMAGE_TAG") ?: "latest"
val awsImageBase = "$awsAccountId.dkr.ecr.$awsRegion.amazonaws.com/$awsEcrRepo"

jib {
    to {
        image = "$awsImageBase:$awsImageTag"
        // Always also tag as latest so App Runner pulls the current build
        tags = setOf("latest")
    }
    from {
        platforms {
            platform {
                architecture = "amd64"
                os = "linux"
            }
        }
    }
    container {
        ports = listOf("8080")
    }
}

// Jib is not configuration-cache compatible; declare it to avoid cache errors.
tasks.named("jib") {
    notCompatibleWithConfigurationCache("Jib task accesses project during execution")
}
tasks.named("jibDockerBuild") {
    notCompatibleWithConfigurationCache("Jib task accesses project during execution")
}



fun env(name: String, default: String) = System.getenv(name) ?: default

val liquibaseEnv = (project.findProperty("liquibaseEnv") as? String)?.trim()?.lowercase() ?: "docker"

var dbAdminUser : String = "postgres"
var dbAdminPassword : String = "postgres"
var dbUser : String = "postgres"
var dbPassword : String = "postgres"
var dbHost : String = "localhost"
var exportDbPassword : String = ""
if (liquibaseEnv == "prod") {
    dbHost = "highschoolhowto.c388sauoez7e.us-west-2.rds.amazonaws.com"
    dbAdminPassword = env("HIGHSCHOOLHOWTO_DB_ADMIN_PROD_PASSWORD", dbAdminPassword)
    dbPassword = env("HIGHSCHOOLHOWTO_DB_PROD_PASSWORD", dbPassword)
    exportDbPassword = env("HIGHSCHOOLHOWTO_DB_EXPORT_PROD_PASSWORD", exportDbPassword)
}
var dbAdminUrl : String = "jdbc:postgresql://$dbHost:5432/postgres"
var dbUrl : String = "jdbc:postgresql://$dbHost:5432/highschoolhowto"

liquibase {
    activities.register("createDb") {
        arguments = mapOf(
            "logLevel" to "info",
            "changelogFile" to "src/main/resources/db/changelog/create-database.sql",
            "url" to dbAdminUrl,
            "username" to dbAdminUser,
            "password" to dbAdminPassword
        )
    }
    activities.register("schema") {
        arguments = mapOf(
            "logLevel" to "info",
            "changelogFile" to "src/main/resources/db/changelog/db.changelog-master.yaml",
            "url" to dbUrl,
            "username" to dbUser,
            "password" to dbPassword,
            "changelogParameters.EXPORT_DB_PASSWORD" to exportDbPassword
        )
    }
    runList = "createDb,schema"
}


val lbRuntime = configurations.named("liquibaseRuntime")

tasks.register<JavaExec>("liquibaseCreateDb") {
    group = "liquibase"
    description = "Create database if missing (admin connection)"
    classpath = lbRuntime.get()
    mainClass.set("liquibase.integration.commandline.Main")
    args(
        "--logLevel=info",
        "--changeLogFile=src/main/resources/db/changelog/create-database.sql",
        "--classpath=src/main/resources",
        "--url=$dbAdminUrl",
        "--username=$dbAdminUser",
        "--password=$dbAdminPassword",
        "update"
    )
}

tasks.register<JavaExec>("liquibaseSchema") {
    group = "liquibase"
    description = "Apply schema changelog to application database"
    classpath = lbRuntime.get()
    mainClass.set("liquibase.integration.commandline.Main")
    args(
        "--logLevel=info",
        "--changeLogFile=src/main/resources/db/changelog/db.changelog-master.yaml",
        "--classpath=src/main/resources",
        "--url=$dbUrl",
        "--username=$dbUser",
        "--password=$dbPassword",
        "update"
    )
}

tasks.register("liquibaseUpdateAll") {
    group = "liquibase"
    description = "Create DB (if needed) then apply schema"
    dependsOn("liquibaseCreateDb", "liquibaseSchema")
}

tasks.register<JavaExec>("lbDropAll") {
    group = "liquibase"
    description = "Drop all database objects using Liquibase CLI"
    classpath = lbRuntime.get()
    mainClass.set("liquibase.integration.commandline.Main")
    args(
        "--changeLogFile=src/main/resources/db/changelog/db.changelog-master.yaml",
        "--url=$dbUrl",
        "--username=$dbUser",
        "--password=$dbPassword",
        "dropAll"
    )
}

tasks.register<JavaExec>("lbRollbackCount") {
    group = "liquibase"
    description = "Rollback the last N changesets (provide -PliquibaseRollbackCount=3)"
    classpath = lbRuntime.get()
    mainClass.set("liquibase.integration.commandline.Main")
    val countProp = (project.findProperty("liquibaseRollbackCount")
        ?: project.findProperty("liquibaseCommandValue"))
        ?: throw GradleException("Provide -PliquibaseRollbackCount=<n> or -PliquibaseCommandValue=<n>")
    args(
        "--changeLogFile=src/main/resources/db/changelog/db.changelog-master.yaml",
        "--url=$dbUrl",
        "--username=$dbUser",
        "--password=$dbPassword",
        "rollbackCount",
        countProp.toString()
    )
}
