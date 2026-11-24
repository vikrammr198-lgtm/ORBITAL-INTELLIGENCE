
import numpy as np

def signed_log_transform(X):
    return np.sign(X) * np.log10(1 + np.abs(X))
