package com.highschoolhowto.support

import com.fasterxml.jackson.databind.ObjectMapper
import com.highschoolhowto.HighSchoolHowToApplication
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder
import org.springframework.test.context.ActiveProfiles
import org.springframework.boot.test.context.SpringBootTestContextBootstrapper
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.context.BootstrapWith
import org.springframework.test.context.ContextConfiguration
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.web.context.WebApplicationContext
import spock.lang.Specification

@BootstrapWith(SpringBootTestContextBootstrapper)
@SpringBootTest(classes = HighSchoolHowToApplication, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ContextConfiguration(classes = TestContainersConfig)
@AutoConfigureMockMvc
@ActiveProfiles("integTest")
@Transactional
abstract class BaseIntegrationSpec extends Specification {

    @Autowired
    MockMvc mockMvc

    @Autowired(required = false)
    WebApplicationContext webApplicationContext

    @Autowired(required = false)
    ObjectMapper objectMapper

    @Autowired(required = false)
    Jackson2ObjectMapperBuilder mapperBuilder

    void setup() {
        if (objectMapper == null) {
            objectMapper = mapperBuilder?.build() ?: Jackson2ObjectMapperBuilder.json().build()
        }
        // If MockMvc was not autowired for any reason, build it from the
        // WebApplicationContext so tests still run (prevents NullPointerException
        // calling perform() on a null mockMvc).
        if (mockMvc == null && webApplicationContext != null) {
            mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build()
        }
    }

    protected ResultActions postJson(String path, Object body) {
        return mockMvc.perform(MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(body)))
    }

    protected ResultActions putJson(String path, Object body, String bearerToken) {
        return mockMvc.perform(MockMvcRequestBuilders.put(path)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer $bearerToken")
                .content(objectMapper.writeValueAsBytes(body)))
    }

    protected ResultActions getWithAuth(String path, String bearerToken) {
        return mockMvc.perform(MockMvcRequestBuilders.get(path)
                .header("Authorization", "Bearer $bearerToken"))
    }
}
