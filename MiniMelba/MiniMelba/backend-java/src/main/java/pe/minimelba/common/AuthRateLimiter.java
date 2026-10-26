package pe.minimelba.common;

import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimiter {
    private static final long WINDOW_MILLIS=15*60*1000L;
    private final ConcurrentHashMap<String,Counter> counters=new ConcurrentHashMap<>();
    public void check(String key) {
        long now=System.currentTimeMillis();
        Counter counter=counters.computeIfAbsent(key,k->new Counter(now));
        synchronized(counter) {
            if(now-counter.startedAt>=WINDOW_MILLIS) { counter.startedAt=now; counter.count=0; }
            if(++counter.count>20) throw ApiException.tooManyRequests("Demasiados intentos. Espera unos minutos y vuelve a intentarlo.");
        }
        if(counters.size()>10000) counters.entrySet().removeIf(e->now-e.getValue().startedAt>WINDOW_MILLIS);
    }
    private static final class Counter { long startedAt; int count; Counter(long startedAt){this.startedAt=startedAt;} }
}
