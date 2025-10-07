import React, { useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../../partials/Sidebar";
import Header from "../../partials/Header";

import NotFoundImage from "../../images/404-illustration.svg";
import NotFoundImageDark from "../../images/404-illustration-dark.svg";

function PageNotFound() {
  return (
    <div className="flex items-center justify-center h-[100vh] h-[100dvh] w-full overflow-hidden">
      <main>
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
          <div className="max-w-2xl m-auto">
            <div className="text-center px-4">
              <div className="inline-flex mb-8">
                <img
                  className="dark:hidden"
                  src={NotFoundImage}
                  width="176"
                  height="176"
                  alt="404 illustration"
                />
                <img
                  className="hidden dark:block"
                  src={NotFoundImageDark}
                  width="176"
                  height="176"
                  alt="404 illustration dark"
                />
              </div>
              <div className="mb-6">页面不存在</div>
              <Link
                to="/"
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PageNotFound;
