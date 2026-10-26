package com.melba.dao;

import com.melba.model.Role;
import com.melba.model.User;
import java.util.List;
import java.util.Optional;

public interface UserDao {

    Optional<User> findByUsername(String username);

    long create(String name, String username, String passwordHash, Role role);

    List<User> findAll();
}