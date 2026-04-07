package com.highschoolhowto.timer

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.tasks.TaskList
import com.highschoolhowto.tasks.TaskListRepository
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
class TimerIntegSpec extends BaseIntegrationSpec {

    @Autowired UserRepository userRepository
    @Autowired TimerRepository timerRepository
    @Autowired TaskListRepository taskListRepository
    @Autowired JwtService jwtService

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

    private String tokenFor(User user) { jwtService.generateAccessToken(user) }

    def "CRUD lifecycle: create, read, update, delete timer"() {
        given:
        def user = createActiveUser("timer-crud@example.com")
        def token = tokenFor(user)

        when: "create a timer"
        def createResp = postJsonWithAuth("/api/timers",
                [title: "Timer", color: "#fef3c7", focusDuration: 25,
                 shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4,
                 presetName: "Classic Pomodoro"], token)
                .andReturn().response

        then: "timer created with correct fields"
        createResp.status == 200
        def created = objectMapper.readValue(createResp.contentAsString, Map)
        created.title == "Timer"
        created.color == "#fef3c7"
        created.focusDuration == 25
        created.shortBreakDuration == 5
        created.longBreakDuration == 15
        created.sessionsBeforeLongBreak == 4
        created.presetName == "Classic Pomodoro"
        created.linkedTaskListId == null
        def timerId = created.id

        when: "fetch all timers"
        def allResp = getWithAuth("/api/timers", token).andReturn().response

        then: "returns the created timer"
        allResp.status == 200
        def all = objectMapper.readValue(allResp.contentAsString, List)
        all.size() == 1
        all[0].id == timerId

        when: "update the timer"
        def updateResp = putJson("/api/timers/$timerId",
                [title: "Deep Work", color: "#dbeafe", focusDuration: 50,
                 shortBreakDuration: 10, longBreakDuration: 30, sessionsBeforeLongBreak: 3,
                 presetName: "Deep Work", clearLinkedTaskList: false], token)
                .andReturn().response

        then: "timer updated"
        updateResp.status == 200
        def updated = objectMapper.readValue(updateResp.contentAsString, Map)
        updated.title == "Deep Work"
        updated.focusDuration == 50

        when: "delete the timer"
        def deleteResp = deleteWithAuth("/api/timers/$timerId", token).andReturn().response

        then: "timer deleted"
        deleteResp.status == 204

        when: "fetch all timers again"
        def emptyResp = getWithAuth("/api/timers", token).andReturn().response

        then: "returns empty list"
        emptyResp.status == 200
        def empty = objectMapper.readValue(emptyResp.contentAsString, List)
        empty.size() == 0
    }

    def "cannot exceed 10 timers per user"() {
        given:
        def user = createActiveUser("timer-limit@example.com")
        def token = tokenFor(user)
        10.times { i ->
            def timer = new Timer()
            timer.user = user
            timer.title = "Timer ${i}"
            timerRepository.save(timer)
        }

        when: "create 11th timer"
        def resp = postJsonWithAuth("/api/timers",
                [title: "Too Many"], token).andReturn().response

        then: "rejected with 422"
        resp.status == 422
    }

    def "cannot access another user's timer"() {
        given:
        def owner = createActiveUser("timer-owner@example.com")
        def other = createActiveUser("timer-other@example.com")
        def ownerToken = tokenFor(owner)
        def otherToken = tokenFor(other)

        def createResp = postJsonWithAuth("/api/timers", [title: "My Timer"], ownerToken)
                .andReturn().response
        def timerId = objectMapper.readValue(createResp.contentAsString, Map).id

        when: "other user tries to delete owner's timer"
        def deleteResp = deleteWithAuth("/api/timers/$timerId", otherToken).andReturn().response

        then: "not found"
        deleteResp.status == 404
    }

    def "linked task list is included in response"() {
        given:
        def user = createActiveUser("timer-linked@example.com")
        def token = tokenFor(user)

        def taskList = new TaskList()
        taskList.user = user
        taskList.title = "To-dos"
        taskListRepository.save(taskList)
        def listId = taskList.id

        when: "create timer with linked list"
        def resp = postJsonWithAuth("/api/timers",
                [title: "Timer", linkedTaskListId: listId.toString()], token)
                .andReturn().response

        then: "linked list id is returned"
        resp.status == 200
        def body = objectMapper.readValue(resp.contentAsString, Map)
        body.linkedTaskListId == listId.toString()
    }

    def "update clears linked task list when clearLinkedTaskList is true"() {
        given:
        def user = createActiveUser("timer-clear-link@example.com")
        def token = tokenFor(user)

        def taskList = new TaskList()
        taskList.user = user
        taskList.title = "To-dos"
        taskListRepository.save(taskList)

        def createResp = postJsonWithAuth("/api/timers",
                [title: "Timer", linkedTaskListId: taskList.id.toString()], token)
                .andReturn().response
        def timerId = objectMapper.readValue(createResp.contentAsString, Map).id

        when: "update with clearLinkedTaskList=true"
        def updateResp = putJson("/api/timers/$timerId",
                [title: "Timer", clearLinkedTaskList: true], token)
                .andReturn().response

        then: "linked list is cleared"
        updateResp.status == 200
        def updated = objectMapper.readValue(updateResp.contentAsString, Map)
        updated.linkedTaskListId == null
    }
}
