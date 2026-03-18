from app.core.build_tutor_core import build_tutor_core


def main() -> None:
    tutor_core = build_tutor_core()

    while True:
        msg = input("Enter message: ")

        if msg in ["e", "exit", "q", "quit"]:
            break

        reply = tutor_core.handle_message(msg)
        print(f"Tutor: {reply}\n")


if __name__ == "__main__":
    main()
