package pe.minimelba.user.service;

import org.junit.jupiter.api.Test;
import pe.minimelba.common.ApiException;
import pe.minimelba.user.dao.UserDao;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    @Test
    void publicRegistrationRejectsAdminRole() {
        UserDao users=mock(UserDao.class);
        AuthService service=new AuthService(users);
        ApiException error=assertThrows(ApiException.class,
                () -> service.register("Administrador","adminuser","password123","admin"));
        assertEquals(400,error.status());
        verifyNoInteractions(users);
    }
}
