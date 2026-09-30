from .stripe_gateway import StripeGateway


def get_payment_gateway():
    return StripeGateway()
