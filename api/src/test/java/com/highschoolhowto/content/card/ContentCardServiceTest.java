package com.highschoolhowto.content.card;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.content.tag.TagRepository;
import com.highschoolhowto.tasks.TaskItem;
import com.highschoolhowto.tasks.TaskList;
import com.highschoolhowto.tasks.TaskListRepository;
import com.highschoolhowto.tasks.TaskItemRepository;
import com.highschoolhowto.tasks.dto.TaskListResponse;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ContentCardServiceTest {

    @Mock
    ContentCardRepository cardRepository;

    @Mock
    TagRepository tagRepository;

    @Mock
    HtmlSanitizerService htmlSanitizer;

    @Mock
    TaskListRepository taskListRepository;

    @Mock
    TaskItemRepository taskItemRepository;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    ContentCardService service;

    private User makeUser(UUID userId) {
        User user = new User();
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, userId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private ContentCard makePublishedTodoCard(Long cardId, String slug) {
        ContentCard card = new ContentCard();
        try {
            var field = ContentCard.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(card, cardId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        card.setSlug(slug);
        card.setTitle("Driver's Test Checklist");
        card.setCardType(CardType.TODO_LIST);
        card.setStatus(CardStatus.PUBLISHED);
        card.setBackgroundColor("#fffef8");

        ContentCardTask task1 = new ContentCardTask();
        task1.setDescription("Get handbook");
        task1.setSortOrder(0);
        task1.setCard(card);

        ContentCardTask task2 = new ContentCardTask();
        task2.setDescription("Take practice test");
        task2.setSortOrder(1);
        task2.setCard(card);

        card.getTemplateTasks().add(task1);
        card.getTemplateTasks().add(task2);
        return card;
    }

    private TaskList makeTaskList(UUID userId, ContentCard card) {
        User user = makeUser(userId);
        TaskList list = new TaskList();
        list.setUser(user);
        list.setTitle(card.getTitle());
        list.setColor(card.getBackgroundColor() != null ? card.getBackgroundColor() : "#fffef8");
        list.setSourceContentCardId(card.getId());
        list.getTasks().addAll(new LinkedHashSet<>());
        return list;
    }

    // --- addToLocker ---

    @Test
    void addToLocker_createsTaskListWithTemplateTasks() {
        UUID userId = UUID.randomUUID();
        Long cardId = 42L;
        ContentCard card = makePublishedTodoCard(cardId, "drivers-test");
        User user = makeUser(userId);

        when(cardRepository.findBySlug("drivers-test")).thenReturn(Optional.of(card));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskListRepository.countByUserId(userId)).thenReturn(0L);

        TaskList savedList = makeTaskList(userId, card);
        when(taskListRepository.save(any(TaskList.class))).thenReturn(savedList);
        when(taskItemRepository.saveAll(any())).thenReturn(List.of());

        TaskListResponse response = service.addToLocker("drivers-test", userId);

        assertThat(response.title()).isEqualTo("Driver's Test Checklist");
        assertThat(response.color()).isEqualTo("#fffef8");
        verify(taskListRepository).save(any(TaskList.class));
        verify(taskItemRepository).saveAll(any());
    }

    @Test
    void addToLocker_failsForNonTodoListCard() {
        UUID userId = UUID.randomUUID();
        ContentCard card = new ContentCard();
        card.setSlug("some-video");
        card.setCardType(CardType.VIDEO);
        card.setStatus(CardStatus.PUBLISHED);

        when(cardRepository.findBySlug("some-video")).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> service.addToLocker("some-video", userId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(taskListRepository, never()).save(any());
    }

    @Test
    void addToLocker_failsAtListLimit() {
        UUID userId = UUID.randomUUID();
        Long cardId = 10L;
        ContentCard card = makePublishedTodoCard(cardId, "checklist");
        User user = makeUser(userId);

        when(cardRepository.findBySlug("checklist")).thenReturn(Optional.of(card));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(taskListRepository.countByUserId(userId))
                .thenReturn((long) com.highschoolhowto.tasks.TaskListService.MAX_LISTS_PER_USER);

        assertThatThrownBy(() -> service.addToLocker("checklist", userId))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));

        verify(taskListRepository, never()).save(any());
    }

    // --- getLockerStatus ---

    @Test
    void getLockerStatus_returnsTrueWhenAdded() {
        UUID userId = UUID.randomUUID();
        Long cardId = 42L;
        ContentCard card = makePublishedTodoCard(cardId, "drivers-test");
        UUID listId = UUID.randomUUID();

        TaskList existingList = makeTaskList(userId, card);
        try {
            var field = TaskList.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(existingList, listId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(cardRepository.findBySlug("drivers-test")).thenReturn(Optional.of(card));
        when(taskListRepository.findFirstByUserIdAndSourceContentCardIdOrderByCreatedAtAsc(userId, cardId))
                .thenReturn(Optional.of(existingList));

        LockerStatusResponse status = service.getLockerStatus("drivers-test", userId);

        assertThat(status.added()).isTrue();
        assertThat(status.taskListId()).isEqualTo(listId);
    }

    @Test
    void getLockerStatus_returnsFalseWhenNotAdded() {
        UUID userId = UUID.randomUUID();
        Long cardId = 42L;
        ContentCard card = makePublishedTodoCard(cardId, "drivers-test");

        when(cardRepository.findBySlug("drivers-test")).thenReturn(Optional.of(card));
        when(taskListRepository.findFirstByUserIdAndSourceContentCardIdOrderByCreatedAtAsc(userId, cardId))
                .thenReturn(Optional.empty());

        LockerStatusResponse status = service.getLockerStatus("drivers-test", userId);

        assertThat(status.added()).isFalse();
        assertThat(status.taskListId()).isNull();
    }

    @Test
    void getLockerStatus_returnsFalseForNonTodoListCard() {
        UUID userId = UUID.randomUUID();
        ContentCard card = new ContentCard();
        card.setSlug("video-card");
        card.setCardType(CardType.VIDEO);
        card.setStatus(CardStatus.PUBLISHED);

        when(cardRepository.findBySlug("video-card")).thenReturn(Optional.of(card));

        LockerStatusResponse status = service.getLockerStatus("video-card", userId);

        assertThat(status.added()).isFalse();
    }

    // --- create TODO_LIST with template tasks ---

    @Test
    void create_todoList_requiresTemplateTasks() {
        SaveCardRequest request = new SaveCardRequest(
                "Checklist", "checklist", null, CardType.TODO_LIST,
                null, null, null, null, null, null, null, null,
                false, CardStatus.DRAFT, List.of(1L), null, null);

        when(cardRepository.existsBySlug("checklist")).thenReturn(false);
        when(tagRepository.findAllById(List.of(1L))).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> {
                    ApiException ae = (ApiException) e;
                    assertThat(ae.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    void create_todoList_rejectsTooManyTasks() {
        List<ContentCardTaskRequest> tasks = new ArrayList<>();
        for (int i = 0; i <= ContentCardService.MAX_TEMPLATE_TASKS; i++) {
            tasks.add(new ContentCardTaskRequest("Task " + i));
        }
        SaveCardRequest request = new SaveCardRequest(
                "Checklist", "checklist", null, CardType.TODO_LIST,
                null, null, null, null, null, null, null, null,
                false, CardStatus.DRAFT, List.of(1L), null, tasks);

        when(cardRepository.existsBySlug("checklist")).thenReturn(false);
        when(tagRepository.findAllById(List.of(1L))).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
