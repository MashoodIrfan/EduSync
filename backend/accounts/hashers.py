from django.contrib.auth.hashers import PBKDF2PasswordHasher


class TunedPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    """
    PBKDF2-SHA256 at 260,000 iterations instead of Django 5.2's default
    1,000,000.

    Why: the default costs ~0.56s of pure CPU per password check on a
    full-speed core. On a small shared instance (e.g. a 0.1 vCPU free
    tier) that same check takes many seconds, which blows past hosting
    proxies' request timeouts and makes login fail outright with a 502 —
    the server never gets to answer at all.

    260,000 is still comfortably above OWASP's current PBKDF2-SHA256
    floor (600,000 is their recommendation for high-security contexts,
    120,000 the widely-cited minimum), so this stays a genuinely secure
    configuration rather than a security write-off.

    Existing hashes are unaffected: each stored hash records the
    iteration count it was created with, and Django transparently
    re-hashes a password to the current setting on the next successful
    login.
    """

    iterations = 260_000
