package com.highschoolhowto.tasks

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integTest")
@Transactional
class TaskListIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    TaskListRepository taskListRepository

    @Autowired
    TaskItemRepository taskItemRepository

    @Autowired
    JwtService jwtService

    private User createActiveUser(String email) {
        def user = new User()
        user.email = email
        user.firstName = "Test"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        return userRepository.save(user)
    }

    private String tokenFor(User user) {
        jwtService.generateAccessToken(user)
    }

    def "CRUD lifecycle: create, read, update title, update color, delete list"() {
        given:
        def user = createActiveUser("list-crud@example.com")
        def token = tokenFor(user)

        when: "create a task list"
        def createResp = postJsonWithAuth("/api/tasklists",
                [title: "To-dos", color: "#fef3c7"], token)
                .andReturn().response

        then: "list created with correct fields"
        createResp.status == 200
        def created = objectMapper.readValue(createResp.contentAsString, Map)
        created.title == "To-dos"
        created.color == "#fef3c7"
        created.textColor == null
        created.tasks == []
        def listId = created.id

        when: "fetch all task lists"
        def allResp = getWithAuth("/api/tasklists", token).andReturn().response

        then: "returns the created list"
        allResp.status == 200
        def all = objectMapper.readValue(allResp.contentAsString, List)
        all.size() == 1
        all[0].id == listId

        when: "update the title"
        def titleResp = putJson("/api/tasklists/$listId/title", [title: "My To-dos"], token)
                .andReturn().response

        then: "title updated"
        titleResp.status == 200
        objectMapper.readValue(titleResp.contentAsString, Map).title == "My To-dos"

        when: "update the color with text color"
        def colorResp = putJson("/api/tasklists/$listId/color",
                [color: "linear-gradient(135deg, #6aabdf, #2368b0)", textColor: "#ffffff"], token)
                .andReturn().response

        then: "color and textColor updated"
        colorResp.status == 200
        def colorBody = objectMapper.readValue(colorResp.contentAsString, Map)
        colorBody.color == "linear-gradient(135deg, #6aabdf, #2368b0)"
        colorBody.textColor == "#ffffff"

        when: "delete the list"
        def deleteResp = deleteWithAuth("/api/tasklists/$listId", token).andReturn().response

        then: "list deleted"
        deleteResp.status == 204

        when: "fetch all again"
        def emptyResp = getWithAuth("/api/tasklists", token).andReturn().response

        then: "returns empty"
        emptyResp.status == 200
        objectMapper.readValue(emptyResp.contentAsString, List).size() == 0
    }

    def "task CRUD with dueAt"() {
        given:
        def user = createActiveUser("task-crud@example.com")
        def token = tokenFor(user)

        def createListResp = postJsonWithAuth("/api/tasklists", [title: "To-dos", color: "#fffef8"], token)
                .andReturn().response
        def listId = objectMapper.readValue(createListResp.contentAsString, Map).id

        when: "add a task with a due date"
        def taskResp = postJsonWithAuth("/api/tasklists/$listId/tasks",
                [description: "Study biology", dueAt: "2026-04-10T15:00:00Z"], token)
                .andReturn().response

        then: "task created with dueAt"
        taskResp.status == 200
        def task = objectMapper.readValue(taskResp.contentAsString, Map)
        task.description == "Study biology"
        task.dueAt == "2026-04-10T15:00:00Z"
        task.completed == false
        def taskId = task.id

        when: "update the task to clear due date"
        def clearResp = putJson("/api/tasklists/$listId/tasks/$taskId",
                [clearDueAt: true], token)
                .andReturn().response

        then: "dueAt is cleared"
        clearResp.status == 200
        objectMapper.readValue(clearResp.contentAsString, Map).dueAt == null

        when: "update task to set a new due date"
        def updateResp = putJson("/api/tasklists/$listId/tasks/$taskId",
                [dueAt: "2026-05-01T09:00:00Z", clearDueAt: false], token)
                .andReturn().response

        then: "dueAt is updated"
        updateResp.status == 200
        objectMapper.readValue(updateResp.contentAsString, Map).dueAt == "2026-05-01T09:00:00Z"
    }

    def "user isolation: user B cannot access user A's lists"() {
        given:
        def userA = createActiveUser("user-a@example.com")
        def userB = createActiveUser("user-b@example.com")
        def tokenA = tokenFor(userA)
        def tokenB = tokenFor(userB)

        when: "user A creates a list"
        def createResp = postJsonWithAuth("/api/tasklists", [title: "Private List", color: "#fffef8"], tokenA)
                .andReturn().response
        def listId = objectMapper.readValue(createResp.contentAsString, Map).id

        then: "created successfully"
        createResp.status == 200

        when: "user B tries to update user A's list title"
        def titleResp = putJson("/api/tasklists/$listId/title", [title: "Stolen Title"], tokenB)
                .andReturn().response

        then: "returns 404"
        titleResp.status == 404

        when: "user B tries to delete user A's list"
        def deleteResp = deleteWithAuth("/api/tasklists/$listId", tokenB).andReturn().response

        then: "returns 404"
        deleteResp.status == 404

        when: "user B lists their own lists"
        def listResp = getWithAuth("/api/tasklists", tokenB).andReturn().response

        then: "user B sees no lists"
        listResp.status == 200
        objectMapper.readValue(listResp.contentAsString, List).size() == 0
    }

    def "per-user limit: returns 422 at max task lists"() {
        given:
        def user = createActiveUser("limit-test@example.com")
        def token = tokenFor(user)

        // Create exactly MAX lists
        (1..TaskListService.MAX_LISTS_PER_USER).each { i ->
            def resp = postJsonWithAuth("/api/tasklists",
                    [title: "List " + i, color: "#fffef8"], token)
                    .andReturn().response
            assert resp.status == 200
        }

        when: "attempt to create one more"
        def overLimitResp = postJsonWithAuth("/api/tasklists",
                [title: "One Too Many", color: "#fffef8"], token)
                .andReturn().response

        then: "returns 422"
        overLimitResp.status == 422
    }

    def "per-list task limit: returns 422 at max tasks per list"() {
        given:
        def user = createActiveUser("task-limit@example.com")
        def token = tokenFor(user)

        def createListResp = postJsonWithAuth("/api/tasklists", [title: "To-dos", color: "#fffef8"], token)
                .andReturn().response
        def listId = objectMapper.readValue(createListResp.contentAsString, Map).id

        // Create exactly MAX tasks
        (1..TaskListService.MAX_TASKS_PER_LIST).each { i ->
            def resp = postJsonWithAuth("/api/tasklists/$listId/tasks",
                    [description: "Task " + i], token)
                    .andReturn().response
            assert resp.status == 200
        }

        when: "attempt to add one more task"
        def overLimitResp = postJsonWithAuth("/api/tasklists/$listId/tasks",
                [description: "One Too Many"], token)
                .andReturn().response

        then: "returns 422"
        overLimitResp.status == 422
    }

    def "task list color VARCHAR(255) supports gradient strings"() {
        given:
        def user = createActiveUser("gradient-test@example.com")
        def token = tokenFor(user)
        def gradient = "linear-gradient(135deg, #6aabdf 0%, #3d8ed4 45%, #2368b0 100%)"

        when: "create a list with a gradient color"
        def resp = postJsonWithAuth("/api/tasklists",
                [title: "Gradient List", color: gradient], token)
                .andReturn().response

        then: "gradient stored and returned correctly"
        resp.status == 200
        def body = objectMapper.readValue(resp.contentAsString, Map)
        body.color == gradient
    }
}
