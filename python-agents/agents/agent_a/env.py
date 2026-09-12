import gymnasium as gym
from gymnasium import spaces
import numpy as np

class CourierDeliveryEnv(gym.Env):
    """
    Gymnasium environment for Courier Agent A RL training.
    State: [current_lat, current_lng, order_dist, order_payout, surge_multiplier]
    Action: 0 = Reject, 1 = Accept
    """
    metadata = {"render_modes": ["human"]}

    def __init__(self):
        super().__init__()
        # Observation space: lat, lng, dist, payout, surge
        self.observation_space = spaces.Box(
            low=np.array([25.5, -100.5, 0.0, 0.0, 1.0], dtype=np.float32),
            high=np.array([25.8, -100.1, 30.0, 500.0, 3.0], dtype=np.float32),
            dtype=np.float32,
        )
        self.action_space = spaces.Discrete(2)
        self.current_step = 0
        self.max_steps = 100

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        obs = np.array([25.6692, -100.3099, 4.0, 75.0, 1.0], dtype=np.float32)
        return obs, {}

    def step(self, action):
        self.current_step += 1
        # Random sample next simulated order
        dist = np.random.uniform(1.0, 12.0)
        surge = np.random.choice([1.0, 1.2, 1.5, 2.0], p=[0.7, 0.15, 0.1, 0.05])
        payout = (25.0 + dist * 12.0) * surge

        # Reward: net profit per km if accepted, small penalty if rejected a lucrative order
        if action == 1:
            fuel_and_time_cost = dist * 4.5
            reward = payout - fuel_and_time_cost
        else:
            reward = 0.0 if (payout / dist) < 18.0 else -5.0

        terminated = self.current_step >= self.max_steps
        truncated = False
        obs = np.array([25.6692, -100.3099, dist, payout, surge], dtype=np.float32)
        return obs, float(reward), terminated, truncated, {}
