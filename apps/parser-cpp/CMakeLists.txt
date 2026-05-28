cmake_minimum_required(VERSION 3.20)
project(parser_cpp CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_compile_options(-Wall -Wextra -O2)

find_package(PkgConfig REQUIRED)
pkg_check_modules(MHD REQUIRED libmicrohttpd)

add_executable(parser-cpp parser.cpp)
target_include_directories(parser-cpp PRIVATE ${MHD_INCLUDE_DIRS})
target_link_libraries(parser-cpp PRIVATE ${MHD_LIBRARIES} pq)
