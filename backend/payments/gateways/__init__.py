from .jazzcash import JazzCashGateway


def get_payment_gateway():
    return JazzCashGateway()