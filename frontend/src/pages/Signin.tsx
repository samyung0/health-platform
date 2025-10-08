import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authClient } from "~/utils/betterAuthClient";
import AuthImage from "../images/auth-image.jpg";

function Signin() {
  // const { data: session } = authClient.useSession();
  const redirect = useNavigate();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (form.current) {
      form.current.reset();
      (form.current.querySelector("input[name='username']") as HTMLInputElement)?.focus();
    }
  }, []);
  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative md:flex">
        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            {/* Header */}
            <div className="flex-1">
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link className="block" to="/">
                  <div className="size-8">
                    <img src={"/logo.png"} alt="Logo" />
                  </div>
                </Link>
              </div>
            </div>

            <div className="max-w-sm mx-auto w-full px-4 py-8">
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">欢迎</h1>
              {/* Form */}
              <form
                ref={form}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const username = formData.get("username") as string;
                  const password = formData.get("password") as string;
                  const { data, error } = await authClient.signIn.username({
                    username: username,
                    password: password,
                  });
                  if (error || !data) {
                    alert("登录失败");
                    form.current?.reset();
                    return;
                  }
                  redirect("/", {
                    replace: true,
                    flushSync: true,
                  });
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="email">
                      账号ID
                    </label>
                    <input
                      id="username"
                      name="username"
                      className="form-input w-full"
                      type="username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="password">
                      密码
                    </label>
                    <input
                      id="password"
                      name="password"
                      className="form-input w-full"
                      type="password"
                      autoComplete="on"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="mr-1">
                    <Link
                      className="text-sm underline hover:no-underline"
                      to="#"
                      // to="/reset-password"
                    >
                      Forgot Password? (TODO)
                    </Link>
                  </div>
                  <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3">
                    登录
                  </button>
                </div>
              </form>
              {/* Footer */}
              {/* <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-700/60">
                <div className="text-sm">
                  Don’t you have an account?{" "}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" to="/signup">
                    Sign Up
                  </Link>
                </div>
                <div className="mt-5">
                  <div className="bg-yellow-500/20 text-yellow-700 px-3 py-2 rounded-sm">
                    <svg className="inline w-3 h-3 shrink-0 fill-current mr-2" viewBox="0 0 12 12">
                      <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                    </svg>
                    <span className="text-sm">To support you during the pandemic super pro features are free until March 31st.</span>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* Image */}
        <div
          className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2"
          aria-hidden="true"
        >
          <img
            className="object-cover object-center w-full h-full"
            src={AuthImage}
            width="760"
            height="1024"
            alt="Authentication"
          />
        </div>
      </div>
    </main>
  );
}

export default Signin;
