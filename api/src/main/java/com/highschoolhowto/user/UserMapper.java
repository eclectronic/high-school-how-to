package com.highschoolhowto.user;

import com.highschoolhowto.user.dto.UserProfileResponse;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getGradeLevel(),
                user.getBio(),
                user.getInterests(),
                user.getUpdatedAt());
    }
}
