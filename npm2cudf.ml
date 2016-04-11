open Nethttp_client
open Yojson.Basic
open Yojson.Basic.Util
open Unix
open Common

module Pcre = Re_pcre

type dep = {
  package: string;
  range: string;
}

type version = {
  deps: dep list;
}

type doc = { 
  id : string;
  versions: (string * version) list;
}

let string_of_option opt =
  match opt with
  | Some x -> x
  | None -> "null"


(*URLs to connect to a local CouchDB replica of the NPM registry*)
let url_doc step count = 
  Printf.sprintf "http://localhost:5984/registry/_design/versions_fixed/_view/all?limit=%d&skip=%d" step count

let concat_ands v =
  if v = [] then "foo" else
  String.concat " , " (
    List.map (fun v ->
      if v = "" then "foo" 
      else Printf.sprintf "foo (%s)" v
    ) v) 

let scoped_re = Pcre.regexp "(^@.+$)|=+|(^http://.+$)|(^http:://.+$)|(^http//.+$)|(^https://.+$)|_|--|&|\\?|\\||\\/|:|'|\\ "

let isInvalidName name =
  try
    ignore (Pcre.extract scoped_re name);
    true
  with
    Not_found -> false



let fix_version v =
  List.fold_left (fun acc re -> Re_str.global_replace re "" acc) v
  [Re_str.regexp "="; Re_str.regexp "\\*"]


let double_base64 name =
  let str = Bytes.to_string (Base64.str_encode name) in
  Bytes.to_string (Base64.str_encode str)


let fix_name name =
  if isInvalidName name
    then double_base64 name
    else name


let parse_range x name =
  let str = Printf.sprintf "\"foo\" : \"%s\"" x in
  let and_sep x = if x = "" then "" else " | " in
  let or_sep x = if x = "" then "" else ", " in
  let const c =
    match c with
    | None -> ""
    | Some (op, v)  ->
        let parsed = Versioning.SemverNode.parse_raw_version v in
        Printf.sprintf "%s%s" op (fix_version v)
  in
  let ands xs = List.fold_left (fun acc (_, c) ->
    if isInvalidName name
    then
      let name_base64 = double_base64 name in
      Printf.sprintf "%s%s%s (%s)" acc (and_sep acc) name (const c)
    else
      if name = ""
        then acc
        else
          if const c = ""
            then Printf.sprintf "%s%s%s" acc (and_sep acc) name
            else Printf.sprintf "%s%s%s (%s)" acc (and_sep acc) name (const c)
  ) "" xs
  in
  let parsed = Npm.Packages.parse_depend ("depends", (Format822.dummy_loc, str)) in
  let str = List.fold_left (fun acc xs ->
    Printf.sprintf "%s%s%s" acc (or_sep acc) (ands xs)
  ) "" parsed in
  str


let get_deps_version deps =
  try
    deps
    |> to_assoc 
    (*|> (fun x -> print_endline (string_of_int (List.length x)); x)*)
    |> List.map (fun (n, r) -> 
      {
      package = n;
      range =
        try parse_range (r |> member "fixed" |> to_string) n
        with Invalid_argument _ -> "hola"
    })
  with Type_error _ -> []

let rows str =
  let json = from_string str in
  json |> member "rows"


let get_data_version obj =
  {
  deps = obj |> member "dependencies" |> get_deps_version;
  }

let get_data_versions versions =
  versions |> to_assoc |> List.map (fun (ver, obj) -> (ver, get_data_version obj))

let get_data id doc =
  {
  id = id;
  versions = get_data_versions doc;
  }

let get_data_list xs =
  let get_id json = json |> member "id" |> to_string in
  xs |> to_list |> List.map (fun json -> json |> member "value" |> get_data (get_id json))


let remove_prefix = List.map (Str.replace_first (Str.regexp "package/") "")

let string_of_deps deps =
  let sep x = if x = "" then "" else "," in
  List.fold_left (fun acc x ->
    if x.range = ""
      then acc
      else Printf.sprintf "%s%s %s" acc (sep acc) x.range
  ) "" deps




let generate_all l oc =
  List.iter (fun package ->
    Printf.fprintf oc "\n";
    List.iter (fun (version, v) ->
    Printf.fprintf oc "\n";
      Printf.fprintf oc "Package: %s\n" package.id;
      Printf.fprintf oc "Version: %s\n" version;
      if List.length v.deps > 0
        then Printf.fprintf oc "Depends: %s\n\n" (string_of_deps v.deps)
        else ()
    ) package.versions
  ) l


let step = 25000

(*We iterate in chunks of 25000 packages because the dataset is too big for the
 * json parser *)
let rec iterate_count oc count =
  print_endline (string_of_int count);
  if count >= 250000
    then ()
    else
      let url = url_doc step count in
      let doc = (Convenience.http_get url) in
      let documents = rows doc |> get_data_list in
      generate_all documents oc;
      iterate_count oc (count + step)
      

let () =
  let oc = open_out "npm2_fix_names.cudf" in
  iterate_count oc 0;
  close_out oc
  (*ignore (Pcre.extract scoped_re "JQueryUI");*)
