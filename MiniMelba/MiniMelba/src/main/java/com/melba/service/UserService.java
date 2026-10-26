package com.melba.service;

import com.melba.dao.UserDao;
import com.melba.model.User;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserDao userDao;

    public UserService(UserDao userDao) {
        this.userDao = userDao;
    }

    public List<User> findAll() {
        return userDao.findAll();
    }
}