package com.highschoolhowto.shortcut;

import com.highschoolhowto.shortcut.dto.CreateShortcutRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutItem;
import com.highschoolhowto.shortcut.dto.ImportShortcutsRequest;
import com.highschoolhowto.shortcut.dto.ImportShortcutsResponse;
import com.highschoolhowto.shortcut.dto.ReorderShortcutsRequest;
import com.highschoolhowto.shortcut.dto.ShortcutResponse;
import com.highschoolhowto.shortcut.dto.UpdateShortcutRequest;
import com.highschoolhowto.user.User;
import com.highschoolhowto.user.UserRepository;
import com.highschoolhowto.web.ApiException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ShortcutService {

    static final int MAX_SHORTCUTS_PER_USER = 50;

    private final ShortcutRepository shortcutRepository;
    private final UserRepository userRepository;

    public ShortcutService(ShortcutRepository shortcutRepository, UserRepository userRepository) {
        this.shortcutRepository = shortcutRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ShortcutResponse> getShortcuts(UUID userId) {
        return shortcutRepository.findByUserIdOrderBySortOrderAsc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShortcutResponse createShortcut(UUID userId, CreateShortcutRequest req) {
        User user = requireUser(userId);
        long count = shortcutRepository.countByUserId(userId);
        if (count >= MAX_SHORTCUTS_PER_USER) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Limit reached",
                    "Maximum of " + MAX_SHORTCUTS_PER_USER + " shortcuts per user reached");
        }

        Shortcut shortcut = new Shortcut();
        shortcut.setUser(user);
        shortcut.setUrl(req.url().trim());

        String name = req.name();
        if (!StringUtils.hasText(name)) {
            name = hostnameOf(req.url());
        }
        shortcut.setName(name.trim());

        if (StringUtils.hasText(req.faviconUrl())) {
            shortcut.setFaviconUrl(req.faviconUrl().trim());
        }
        if (StringUtils.hasText(req.emoji())) {
            shortcut.setEmoji(req.emoji().trim());
        }
        if (StringUtils.hasText(req.iconUrl())) {
            shortcut.setIconUrl(req.iconUrl().trim());
        }
        shortcut.setSortOrder((int) count); // append after existing shortcuts

        return toResponse(shortcutRepository.save(shortcut));
    }

    @Transactional
    public ShortcutResponse updateShortcut(UUID userId, UUID id, UpdateShortcutRequest req) {
        Shortcut shortcut = requireOwned(id, userId);
        shortcut.setUrl(req.url().trim());
        shortcut.setName(req.name().trim());
        shortcut.setFaviconUrl(StringUtils.hasText(req.faviconUrl()) ? req.faviconUrl().trim() : null);
        shortcut.setEmoji(StringUtils.hasText(req.emoji()) ? req.emoji().trim() : null);
        shortcut.setIconUrl(StringUtils.hasText(req.iconUrl()) ? req.iconUrl().trim() : null);
        return toResponse(shortcutRepository.save(shortcut));
    }

    @Transactional
    public void deleteShortcut(UUID userId, UUID id) {
        Shortcut shortcut = requireOwned(id, userId);
        shortcutRepository.delete(shortcut);
    }

    @Transactional
    public ImportShortcutsResponse importShortcuts(UUID userId, ImportShortcutsRequest req) {
        if (req.shortcuts() == null || req.shortcuts().isEmpty()) {
            return new ImportShortcutsResponse(0, 0, null);
        }

        User user = requireUser(userId);

        // Load existing URLs upfront to deduplicate
        Set<String> existingUrls = new HashSet<>(shortcutRepository.findUrlsByUserId(userId));
        long currentCount = shortcutRepository.countByUserId(userId);
        long remaining = MAX_SHORTCUTS_PER_USER - currentCount;

        int imported = 0;
        int skipped = 0;
        String stopReason = null;

        for (ImportShortcutItem item : req.shortcuts()) {
            if (remaining <= 0) {
                stopReason = "Limit of " + MAX_SHORTCUTS_PER_USER + " shortcuts reached";
                skipped += (req.shortcuts().size() - imported - skipped);
                break;
            }
            if (existingUrls.contains(item.url())) {
                skipped++;
                continue;
            }

            Shortcut shortcut = new Shortcut();
            shortcut.setUser(user);
            shortcut.setUrl(item.url().trim());

            String name = item.name();
            if (!StringUtils.hasText(name)) {
                name = hostnameOf(item.url());
            }
            shortcut.setName(name.trim());

            if (StringUtils.hasText(item.emoji())) {
                shortcut.setEmoji(item.emoji().trim());
            }
            if (StringUtils.hasText(item.iconUrl())) {
                shortcut.setIconUrl(item.iconUrl().trim());
            }

            shortcutRepository.save(shortcut);
            existingUrls.add(item.url());
            imported++;
            remaining--;
        }

        return new ImportShortcutsResponse(imported, skipped, stopReason);
    }

    @Transactional(readOnly = true)
    public List<ShortcutResponse> exportShortcuts(UUID userId) {
        return getShortcuts(userId);
    }

    @Transactional
    public void seedDefaultGoogleShortcuts(User user) {
        record DefaultPin(String url, String name, String emoji) {}
        var defaults = List.of(
            new DefaultPin("https://mail.google.com", "Gmail", "📧"),
            new DefaultPin("https://drive.google.com", "Google Drive", "📁")
        );
        int sortOrder = 0;
        for (DefaultPin pin : defaults) {
            Shortcut shortcut = new Shortcut();
            shortcut.setUser(user);
            shortcut.setUrl(pin.url());
            shortcut.setName(pin.name());
            shortcut.setEmoji(pin.emoji());
            shortcut.setSortOrder(sortOrder++);
            shortcutRepository.save(shortcut);
        }
    }

    @Transactional
    public void reorderShortcuts(UUID userId, ReorderShortcutsRequest req) {
        List<Shortcut> owned = shortcutRepository.findByUserIdOrderBySortOrderAsc(userId);
        java.util.Map<UUID, Shortcut> byId = new java.util.HashMap<>();
        owned.forEach(s -> byId.put(s.getId(), s));
        int position = 0;
        for (UUID id : req.ids()) {
            Shortcut s = byId.get(id);
            if (s != null) {
                s.setSortOrder(position++);
            }
        }
        shortcutRepository.saveAll(owned);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "User not found"));
    }

    private Shortcut requireOwned(UUID id, UUID userId) {
        return shortcutRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Shortcut not found", "Shortcut not found for this user"));
    }

    private String hostnameOf(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            return host != null ? host : url;
        } catch (URISyntaxException e) {
            return url;
        }
    }

    private ShortcutResponse toResponse(Shortcut shortcut) {
        return new ShortcutResponse(
                shortcut.getId(),
                shortcut.getUrl(),
                shortcut.getName(),
                shortcut.getFaviconUrl(),
                shortcut.getEmoji(),
                shortcut.getIconUrl());
    }
}
