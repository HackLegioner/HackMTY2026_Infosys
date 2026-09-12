import os
import sys

def train_agent_a():
    """
    Train DQN agent on CourierDeliveryEnv for 50,000 steps (~15-20 min on CPU).
    """
    try:
        from stable_baselines3 import DQN
        from agents.agent_a.env import CourierDeliveryEnv
    except ImportError:
        print("[Agent A Train] stable-baselines3 not installed, skipping direct training.")
        return

    env = CourierDeliveryEnv()
    output_dir = os.path.join(os.path.dirname(__file__), "weights")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "dqn_courier")

    print("[Agent A Train] Starting DQN training on CPU...")
    model = DQN("MlpPolicy", env, verbose=1, learning_rate=1e-3, buffer_size=10000)
    model.learn(total_timesteps=10000)
    model.save(model_path)
    print(f"[Agent A Train] Saved trained weights to {model_path}.zip")

if __name__ == "__main__":
    train_agent_a()
