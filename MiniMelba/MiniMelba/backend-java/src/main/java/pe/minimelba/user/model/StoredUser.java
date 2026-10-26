package pe.minimelba.user.model;

public record StoredUser(long id, String name, String username, String role, String passwordHash, boolean active) {}
